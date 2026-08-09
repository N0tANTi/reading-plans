import test from 'node:test'
import assert from 'node:assert/strict'
import { replaceMarkdownBody, syncToGithub } from './upload-utils.mjs'

test('replaces only the Markdown body and preserves frontmatter exactly', () => {
  const original = `---
title: 原标题
subtitle: 原副标题
order: 1712345678901
date: 2026-08-09
---

旧正文`

  const updated = replaceMarkdownBody(original, '# 新正文\n\n| A | B |\n|---|---|\n| 1 | 2 |')

  assert.match(updated, /^---\ntitle: 原标题\nsubtitle: 原副标题\norder: 1712345678901\ndate: 2026-08-09\n---\n/)
  assert.doesNotMatch(updated, /旧正文/)
  assert.match(updated, /# 新正文/)
  assert.match(updated, /\| A \| B \|/)
})

test('rejects replacement when frontmatter is missing', () => {
  assert.throws(
    () => replaceMarkdownBody('# 普通正文', '新版正文'),
    /缺少有效的 frontmatter/,
  )
})

test('updates an existing GitHub file with its current sha', async () => {
  const originalFetch = globalThis.fetch
  const originalRepo = process.env.GITHUB_REPO
  const originalToken = process.env.GITHUB_TOKEN
  const calls = []
  process.env.GITHUB_REPO = 'owner/repo'
  process.env.GITHUB_TOKEN = 'test-token'
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options })
    if (!options.method) {
      return { ok: true, status: 200, json: async () => ({ sha: 'existing-sha' }) }
    }
    return { ok: true, status: 200 }
  }

  try {
    await syncToGithub({
      filePath: 'src/data/essay.md',
      fileContent: 'updated',
      title: 'Essay',
    }, 'replace')

    assert.equal(calls.length, 2)
    const payload = JSON.parse(calls[1].options.body)
    assert.equal(payload.sha, 'existing-sha')
    assert.equal(payload.message, '更新阅读计划: Essay')
  } finally {
    globalThis.fetch = originalFetch
    if (originalRepo === undefined) delete process.env.GITHUB_REPO
    else process.env.GITHUB_REPO = originalRepo
    if (originalToken === undefined) delete process.env.GITHUB_TOKEN
    else process.env.GITHUB_TOKEN = originalToken
  }
})
