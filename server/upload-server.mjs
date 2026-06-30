import http from 'node:http'
import { access, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

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

async function backupToGithub({ filePath, fileContent, title }) {
  const repo = process.env.GITHUB_REPO
  const token = process.env.GITHUB_TOKEN
  if (!repo || !token) return { skipped: true }

  const encoded = Buffer.from(fileContent).toString('base64')
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28',
  }

  const checkRes = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, { headers })
  if (checkRes.ok) return { skipped: false, warning: 'GitHub 已有同名文件，本次只更新了服务器本地。' }
  if (checkRes.status !== 404) {
    const detail = await checkRes.text()
    return { skipped: false, warning: `GitHub 备份检查失败：${detail}` }
  }

  const createRes = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      message: `新增阅读计划: ${title}`,
      content: encoded,
    }),
  })

  if (!createRes.ok) {
    const detail = await createRes.text()
    return { skipped: false, warning: `GitHub 备份失败：${detail}` }
  }

  return { skipped: false }
}

async function handleUpload(req, res) {
  const payload = await readJsonBody(req)
  const { password, filename, content, title } = payload

  if (!password || password !== process.env.UPLOAD_PASSWORD) {
    return sendJson(res, 401, { error: '密码错误' })
  }
  if (!filename || !content || !title) {
    return sendJson(res, 400, { error: '请填写文件名、标题，并选择 Markdown 文件' })
  }

  const markdownFile = buildMarkdownFile(payload)
  await ensureNewLocalFile(markdownFile.filePath)
  await writeLocalMarkdown(markdownFile)
  await queueRedeploy()

  const backup = await backupToGithub({ ...markdownFile, title })
  const message = backup.warning
    ? `上传成功，页面已更新。${backup.warning}`
    : backup.skipped
      ? '上传成功，页面已更新。当前未配置 GitHub 备份。'
      : '上传成功，页面已更新，并已备份到 GitHub。'

  return sendJson(res, 200, { success: true, message })
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
