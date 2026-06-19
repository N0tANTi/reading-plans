# 阅读计划 Reading Plans

个人哲学阅读计划看板，支持多设备在线查看、在线新增计划。

## 部署到 Vercel（三步）

### 1. 推送到 GitHub

```bash
git init
git add .
git commit -m "init: reading plans site"
git branch -M main
git remote add origin https://github.com/你的用户名/reading-plans.git
git push -u origin main
```

### 2. 连接 Vercel 并设置环境变量

1. 打开 [vercel.com](https://vercel.com)，用 GitHub 登录
2. 点 "Add New Project"，选择 `reading-plans` 仓库
3. **部署前**，展开 "Environment Variables"，添加以下三个变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `GITHUB_TOKEN` | 你的 GitHub Personal Access Token | [创建方法见下文](#创建-github-token) |
| `GITHUB_REPO` | `你的用户名/reading-plans` | 仓库路径 |
| `UPLOAD_PASSWORD` | 自己设一个密码 | 上传时需要输入 |

4. 点 Deploy

### 3. 创建 GitHub Token

1. 打开 https://github.com/settings/tokens?type=beta （Fine-grained tokens）
2. 点 "Generate new token"
3. Token name 随便填（如 `reading-plans-upload`）
4. Expiration 选个长一点的（如 1 年）
5. Repository access 选 "Only select repositories"，选中 `reading-plans`
6. Permissions → Repository permissions → Contents → 选 **Read and write**
7. 点 Generate token，复制 token 填到 Vercel 环境变量

## 使用方式

### 在线新增计划
打开网站，点侧栏的「+ 新增计划」，上传 MD 文件，填写标题等信息，输入上传密码，提交。约 1 分钟后刷新页面即可看到。

### 手动新增
编辑 `src/data/` 下的 `.md` 文件，push 到 GitHub，Vercel 自动重新部署。

MD 文件需要在头部加 frontmatter：

```markdown
---
title: 标题
subtitle: 副标题
icon: 📖
desc: 关键词1 · 关键词2
order: 4
---

正文内容...
```

## 本地开发

```bash
npm install
npm run dev
```

浏览器打开 `http://localhost:5173`
