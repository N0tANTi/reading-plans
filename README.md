# 阅读计划 Reading Plans

个人哲学阅读计划看板。报纸排版风格 · 长文阅读 · 多设备在线查看 · 在线新增栏目。

## 部署到 Vercel

### 1. 推送到 GitHub

覆盖原项目文件后：

```bash
git add .
git commit -m "redesign: academic newspaper reading layout"
git push
```

### 2. 环境变量（仅在线上传功能需要）

Vercel → 项目 → Settings → Environment Variables：

| 变量名 | 值 |
|--------|-----|
| `UPLOAD_PASSWORD` | 自定义上传密码 |
| `GITHUB_REPO` | `你的用户名/reading-plans` |
| `GITHUB_TOKEN` | GitHub Fine-grained token（Contents 读写权限） |

改完环境变量后到 Deployments 页 Redeploy 一次。

## 阅读计划文件格式

`src/data/` 下每个 `.md` 文件头部的 frontmatter：

```markdown
---
title: 标题
subtitle: 副标题
desc: 关键词1 · 关键词2
order: 1
---

正文内容...
```

## 在线新增栏目

点侧栏「+ 新增栏目」，上传 MD 文件、填标题和索引词、输入密码，提交。
约 1 分钟后刷新即可看到。

## 本地开发

```bash
npm install
npm run dev
```
