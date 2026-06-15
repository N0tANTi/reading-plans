# 阅读计划 Reading Plans

个人哲学阅读计划看板，支持多设备在线查看。

## 部署到 Vercel（三步）

### 1. 推送到 GitHub

```bash
# 在项目目录下
git init
git add .
git commit -m "init: reading plans site"
# 在 GitHub 上新建一个仓库（比如 reading-plans），然后：
git remote add origin https://github.com/你的用户名/reading-plans.git
git branch -M main
git push -u origin main
```

### 2. 连接 Vercel

1. 打开 [vercel.com](https://vercel.com)，用 GitHub 登录
2. 点 "Add New Project"
3. 选择刚才的 `reading-plans` 仓库
4. Framework Preset 会自动识别为 Vite，**不需要改任何设置**
5. 点 Deploy

### 3. 完成

部署完成后 Vercel 会给你一个 `xxx.vercel.app` 的域名，任何设备都能访问。

## 更新阅读计划

编辑 `src/data/` 下的三个 `.md` 文件：

- `politics.md` — 政治哲学（阿伦特）
- `aesthetics.md` — 美学（本雅明）
- `subjectivity.md` — 主体性研究（断裂与叙事）

改完后 `git push`，Vercel 会自动重新部署。

## 新增阅读计划

1. 在 `src/data/` 下新建一个 `.md` 文件
2. 在 `src/App.jsx` 的 `plans` 数组里加一个条目（照着现有的格式写就行）
3. Push

## 本地开发

```bash
npm install
npm run dev
```

浏览器打开 `http://localhost:5173`
