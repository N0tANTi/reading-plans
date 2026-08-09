import http from 'node:http'
import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { replaceMarkdownBody, syncToGithub } from './upload-utils.mjs'

const port = Number(process.env.PORT || 3001)
const maxBodyBytes = Number(process.env.MAX_BODY_BYTES || 2 * 1024 * 1024)
const serverDir = path.dirname(fileURLToPath(import.meta.url))
const appDir = process.env.APP_DIR || path.resolve(serverDir, '..')

let redeployChain = Promise.resolve()

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })
  res.end(JSON.stringify(payload))
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.setEncoding('utf8')
    req.on('data', chunk => {
      body += chunk
      if (Buffer.byteLength(body, 'utf8') > maxBodyBytes) {
        reject(new Error('上传内容过大'))
        req.destroy()
      }
    })
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch {
        reject(new Error('请求格式不是有效的 JSON'))
      }
    })
    req.on('error', reject)
  })
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: appDir,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      ...options,
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', chunk => { stdout += chunk })
    child.stderr.on('data', chunk => { stderr += chunk })
    child.on('error', reject)
    child.on('close', code => {
      if (code === 0) resolve({ stdout, stderr })
      else reject(new Error(`${command} ${args.join(' ')} failed: ${stderr || stdout}`))
    })
  })
}

function buildMarkdownFile(payload) {
  const { filename, content, title, subtitle, icon, desc } = payload
  const safeName = filename.replace(/[^\w\u4e00-\u9fff-]/g, '_')
  const order = Date.now()
  const uploadedDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(order))

  return {
    filePath: `src/data/${safeName}.md`,
    fileContent: `---
title: ${title}
subtitle: ${subtitle || ''}
icon: ${icon || ''}
desc: ${desc || ''}
order: ${order}
date: ${uploadedDate}
---

${content}`,
  }
}

function resolveDataFile(filePath) {
  const absolutePath = path.resolve(appDir, filePath)
  const dataDir = path.resolve(appDir, 'src/data')
  if (!absolutePath.startsWith(`${dataDir}${path.sep}`)) {
    throw new Error('文件路径不安全')
  }
  return { absolutePath, dataDir }
}

async function ensureNewLocalFile(filePath) {
  const { absolutePath } = resolveDataFile(filePath)
  try {
    await access(absolutePath)
    const err = new Error(`文件 ${path.basename(filePath)} 已存在，请换一个文件名`)
    err.statusCode = 409
    throw err
  } catch (err) {
    if (err.code === 'ENOENT') return
    throw err
  }
}

async function buildReplacementFile(filename, content) {
  const safeName = filename.replace(/[^\w\u4e00-\u9fff-]/g, '_')
  const filePath = `src/data/${safeName}.md`
  const { absolutePath } = resolveDataFile(filePath)

  try {
    const current = await readFile(absolutePath, 'utf8')
    const title = current.match(/^title:\s*(.+)$/m)?.[1]?.trim() || safeName
    return {
      filePath,
      fileContent: replaceMarkdownBody(current, content),
      title,
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      const notFound = new Error(`找不到栏目 ${safeName}，请刷新页面后重试`)
      notFound.statusCode = 404
      throw notFound
    }
    throw err
  }
}

async function writeLocalMarkdown({ filePath, fileContent }) {
  const { absolutePath, dataDir } = resolveDataFile(filePath)
  await mkdir(dataDir, { recursive: true })
  await writeFile(absolutePath, fileContent, 'utf8')
}

async function redeploySite() {
  if (process.env.SKIP_REDEPLOY === '1') return
  await run('npm', ['run', 'build'])
}

function queueRedeploy() {
  redeployChain = redeployChain.then(redeploySite, redeploySite)
  return redeployChain
}

async function handleUpload(req, res) {
  const payload = await readJsonBody(req)
  const { password, filename, content, title, mode = 'create' } = payload

  if (!password || password !== process.env.UPLOAD_PASSWORD) {
    return sendJson(res, 401, { error: '密码错误' })
  }
  if (!['create', 'replace'].includes(mode)) {
    return sendJson(res, 400, { error: '不支持的操作类型' })
  }
  if (!filename || !content || (mode === 'create' && !title)) {
    return sendJson(res, 400, {
      error: mode === 'replace'
        ? '请选择要更新的栏目和新版 Markdown 文件'
        : '请填写文件名、标题，并选择 Markdown 文件',
    })
  }

  const markdownFile = mode === 'replace'
    ? await buildReplacementFile(filename, content)
    : buildMarkdownFile(payload)
  if (mode === 'create') await ensureNewLocalFile(markdownFile.filePath)
  let backup
  if (mode === 'create') backup = await syncToGithub(markdownFile, mode)
  await writeLocalMarkdown(markdownFile)
  await queueRedeploy()
  if (mode === 'replace') backup = await syncToGithub(markdownFile, mode)

  const action = mode === 'replace' ? '更新' : '上传'
  const warning = Boolean(backup.warning || backup.skipped)
  const message = warning
    ? `${action}成功，页面已更新。${backup.warning}`
    : `${action}成功，页面已更新，并已同步到 GitHub。`

  return sendJson(res, 200, { success: true, warning, message })
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return sendJson(res, 200, {})
  if (req.url !== '/api/upload') return sendJson(res, 404, { error: 'Not found' })
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' })

  try {
    await handleUpload(req, res)
  } catch (err) {
    sendJson(res, err.statusCode || 500, { error: err.message || '请求失败' })
  }
})

server.listen(port, '127.0.0.1', () => {
  console.log(`reading-plans upload server listening on http://127.0.0.1:${port}`)
})
