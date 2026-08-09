import path from 'node:path'

export function replaceMarkdownBody(raw, content) {
  const match = raw.match(/^(\uFEFF?---\r?\n[\s\S]*?\r?\n---\r?\n)[\s\S]*$/)
  if (!match) {
    const err = new Error('现有稿件缺少有效的 frontmatter，无法安全替换正文')
    err.statusCode = 422
    throw err
  }
  return `${match[1]}\n${content.replace(/^\s+/, '')}`
}

export async function syncToGithub({ filePath, fileContent, title }, mode) {
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
  let existingSha = ''
  if (checkRes.ok) {
    const existing = await checkRes.json()
    existingSha = existing.sha || ''
    if (mode === 'create') {
      const err = new Error(`文件 ${path.basename(filePath)} 已存在，请换一个文件名`)
      err.statusCode = 409
      throw err
    }
  }
  if (checkRes.status !== 404 && !checkRes.ok) {
    const detail = await checkRes.text()
    const err = new Error(`GitHub 同步检查失败：${detail}`)
    err.statusCode = 502
    throw err
  }

  const saveRes = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      message: `${mode === 'replace' ? '更新' : '新增'}阅读计划: ${title}`,
      content: encoded,
      ...(existingSha ? { sha: existingSha } : {}),
    }),
  })

  if (!saveRes.ok) {
    const detail = await saveRes.text()
    const err = new Error(`GitHub 同步失败：${detail}`)
    err.statusCode = 502
    throw err
  }

  return { skipped: false }
}
