export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { password, filename, content, title, subtitle, icon, desc } = req.body;

  // Verify password
  if (!password || password !== process.env.UPLOAD_PASSWORD) {
    return res.status(401).json({ error: '密码错误' });
  }

  // Validate inputs
  if (!filename || !content || !title) {
    return res.status(400).json({ error: '请填写文件名和标题' });
  }

  // Sanitize filename: only allow alphanumeric, Chinese chars, hyphens, underscores
  const safeName = filename.replace(/[^\w\u4e00-\u9fff-]/g, '_');
  const order = Date.now(); // ensures new plans appear at the end

  // Build MD file with frontmatter
  const uploadedDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(order));
  const fileContent = `---
title: ${title}
subtitle: ${subtitle || ''}
icon: ${icon || '📖'}
desc: ${desc || ''}
order: ${order}
date: ${uploadedDate}
---

${content}`;

  const path = `src/data/${safeName}.md`;
  const encoded = Buffer.from(fileContent).toString('base64');

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_REPO = process.env.GITHUB_REPO;

  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    return res.status(500).json({ error: '服务端未配置 GitHub Token' });
  }

  try {
    // Check if file already exists
    const checkRes = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`,
      { headers: { Authorization: `Bearer ${GITHUB_TOKEN}` } }
    );

    if (checkRes.ok) {
      return res.status(409).json({ error: `文件 ${safeName}.md 已存在，请换一个文件名` });
    }

    // Create file via GitHub API
    const createRes = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `新增阅读计划: ${title}`,
          content: encoded,
        }),
      }
    );

    if (!createRes.ok) {
      const err = await createRes.json();
      return res.status(500).json({ error: err.message || 'GitHub API 请求失败' });
    }

    return res.status(200).json({ success: true, message: '上传成功，约1分钟后刷新页面即可看到' });
  } catch (err) {
    return res.status(500).json({ error: err.message || '请求失败' });
  }
}
