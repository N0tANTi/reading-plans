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
  if (!repo || !token) {
    return { skipped: true, warning: 'GitHub 备份尚未配置；网站正文已正常保存。' }
  }

  const encoded = Buffer.from(fileContent).toString('base64')
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28',
  }

  try {
    const checkRes = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
      headers,
      signal: AbortSignal.timeout(10000),
    })
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
      return {
        skipped: false,
        warning: checkRes.status === 401
          ? 'GitHub 备份凭据已失效；网站正文已正常保存。'
          : 'GitHub 备份暂时不可用；网站正文已正常保存。',
      }
    }

    const saveRes = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
      method: 'PUT',
      headers,
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({
        message: `${mode === 'replace' ? '更新' : '新增'}阅读计划: ${title}`,
        content: encoded,
        ...(existingSha ? { sha: existingSha } : {}),
      }),
    })

    if (!saveRes.ok) {
      return {
        skipped: false,
        warning: saveRes.status === 401
          ? 'GitHub 备份凭据已失效；网站正文已正常保存。'
          : 'GitHub 备份暂时不可用；网站正文已正常保存。',
      }
    }

    return { skipped: false }
  } catch (err) {
    if (err.statusCode === 409) throw err
    return { skipped: false, warning: 'GitHub 备份暂时不可用；网站正文已正常保存。' }
  }
}
