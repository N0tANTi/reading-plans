import http from 'node:http'
import { mkdir, writeFile } from 'node:fs/promises'
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

async function redeploySite() {
  if (process.env.SKIP_REDEPLOY === '1') return
  await run('npm', ['run', 'build'])
}

function queueRedeploy() {
  redeployChain = redeployChain.then(redeploySite, redeploySite)
  return redeployChain
}

async function createGithubFile(payload) {
  const { filename, content, title, subtitle, icon, desc } = payload
  const safeName = filename.replace(/[^\w\u4e00-\u9fff-]/g, '_')
  const order = Date.now()
  const uploadedDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(order))

  const fileContent = `---
title: ${title}
subtitle: ${subtitle || ''}
icon: ${icon || ''}
desc: ${desc || ''}
order: ${order}
date: ${uploadedDate}
---

${content}`

  const repo = process.env.GITHUB_REPO
  const token = process.env.GITHUB_TOKEN
  const filePath = `src/data/${safeName}.md`
  const encoded = Buffer.from(fileContent).toString('base64')
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28',
  }

  const checkRes = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, { headers })
  if (checkRes.ok) {
    const err = new Error(`文件 ${safeName}.md 已存在，请换一个文件名`)
    err.statusCode = 409
    throw err
  }
  if (checkRes.status !== 404) {
    const detail = await checkRes.text()
    throw new Error(`GitHub 文件检查失败：${detail}`)
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
    throw new Error(`GitHub 文件创建失败：${detail}`)
  }

  return { filePath, fileContent }
}

async function writeLocalMarkdown({ filePath, fileContent }) {
  const absolutePath = path.resolve(appDir, filePath)
  const dataDir = path.resolve(appDir, 'src/data')
  if (!absolutePath.startsWith(`${dataDir}${path.sep}`)) {
    throw new Error('文件路径不安全')
  }
  await mkdir(dataDir, { recursive: true })
  await writeFile(absolutePath, fileContent, 'utf8')
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
  if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_REPO) {
    return sendJson(res, 500, { error: '服务器还没有配置 GitHub Token' })
  }

  const localFile = await createGithubFile(payload)
  await writeLocalMarkdown(localFile)
  await queueRedeploy()
  return sendJson(res, 200, { success: true, message: '上传成功，页面已更新。刷新后即可看到新栏目。' })
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
