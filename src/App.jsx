import { useState, useEffect, useCallback, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

function parseFrontmatter(raw) {
  const text = raw.replace(/^\uFEFF/, '')
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)
  if (!m) return { meta: {}, content: text }
  const meta = {}
  m[1].split('\n').forEach(line => {
    const idx = line.indexOf(':')
    if (idx > 0) meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
  })
  return { meta, content: m[2] }
}

function stripLeadingH1(md) {
  return md.replace(/^\s*#\s+.*(\r?\n)+/, '')
}

const mdModules = import.meta.glob('./data/*.md', { query: '?raw', import: 'default', eager: true })

const plans = Object.entries(mdModules)
  .map(([path, raw]) => {
    const { meta, content } = parseFrontmatter(raw)
    const filename = path.split('/').pop().replace('.md', '')
    const order = parseInt(meta.order) || 999
    return {
      id: filename,
      title: meta.title || filename,
      subtitle: meta.subtitle || '',
      desc: meta.desc || '',
      order,
      date: meta.date || '',
      content: stripLeadingH1(content),
    }
  })
  .sort((a, b) => a.order - b.order)

const pad2 = (n) => String(n).padStart(2, '0')

function formatIssueDate(plan) {
  if (plan?.date) return plan.date.replaceAll('-', '/')
  if (plan?.order > 1000000000000) {
    return new Intl.DateTimeFormat('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(plan.order))
  }
  return 'Archive'
}

function UploadModal({ onClose, initialMode, initialPlanId }) {
  const [mode, setMode] = useState(initialMode)
  const [form, setForm] = useState({ title: '', subtitle: '', desc: '', filename: '', password: '' })
  const [selectedId, setSelectedId] = useState(initialPlanId)
  const [fileContent, setFileContent] = useState('')
  const [fileName, setFileName] = useState('')
  const [status, setStatus] = useState({ type: '', msg: '' })
  const [loading, setLoading] = useState(false)
  const fileRef = useRef()
  const isReplace = mode === 'replace'
  const selectedPlan = plans.find(plan => plan.id === selectedId) || plans[0]

  const switchMode = (nextMode) => {
    setMode(nextMode)
    setFileContent('')
    setFileName('')
    setStatus({ type: '', msg: '' })
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    if (!isReplace) {
      setForm(f => ({ ...f, filename: file.name.replace(/\.md$/i, '') }))
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      let text = ev.target.result
      const fmMatch = text.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n([\s\S]*)$/)
      if (fmMatch) text = fmMatch[1]
      setFileContent(text)
    }
    reader.readAsText(file)
  }

  const handleSubmit = async () => {
    if (!fileContent) return setStatus({ type: 'error', msg: '请选择一个 .md 文件' })
    if (isReplace && !selectedId) return setStatus({ type: 'error', msg: '请选择要更新的栏目' })
    if (!isReplace && !form.title) return setStatus({ type: 'error', msg: '请填写标题' })
    if (!form.password) return setStatus({ type: 'error', msg: '请输入上传密码' })
    setLoading(true)
    setStatus({ type: '', msg: '' })
    try {
      const payload = isReplace
        ? { mode, filename: selectedId, password: form.password, content: fileContent }
        : { ...form, mode, icon: '', content: fileContent }
      const res = await fetch('/gazette/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (res.ok) {
        setStatus({
          type: data.warning ? 'warning' : 'success',
          msg: data.message || `${isReplace ? '更新' : '上传'}成功，刷新页面即可看到。`,
        })
        setForm({ title: '', subtitle: '', desc: '', filename: '', password: form.password })
        setFileContent('')
        setFileName('')
        if (fileRef.current) fileRef.current.value = ''
      } else {
        setStatus({ type: 'error', msg: data.error || '上传失败' })
      }
    } catch (err) {
      setStatus({ type: 'error', msg: '网络错误：' + err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-mark">Editorial Desk · Revision Control</div>
            <h2 className="modal-title">{isReplace ? '更新现有栏目' : '新增阅读栏目'}</h2>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="关闭">×</button>
        </div>

        <div className="modal-body">
          <div className="editor-mode" role="tablist" aria-label="稿件操作">
            <button
              type="button"
              role="tab"
              aria-selected={!isReplace}
              className={`editor-mode-tab ${!isReplace ? 'active' : ''}`}
              onClick={() => switchMode('create')}
            >
              新增栏目
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isReplace}
              className={`editor-mode-tab ${isReplace ? 'active' : ''}`}
              onClick={() => switchMode('replace')}
            >
              更新正文
            </button>
          </div>

          {isReplace && (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="replace-plan">选择现有栏目 *</label>
                <select
                  id="replace-plan"
                  className="form-input form-select"
                  value={selectedId}
                  onChange={e => setSelectedId(e.target.value)}
                >
                  {plans.map(plan => <option key={plan.id} value={plan.id}>{plan.title}</option>)}
                </select>
              </div>
              <div className="revision-card">
                <span className="revision-card-label">Protected metadata</span>
                <strong>{selectedPlan?.title}</strong>
                <code>src/data/{selectedPlan?.id}.md</code>
                <p>本次只替换正文；标题、副标题、文件名、发布日期和栏目顺序保持不变。</p>
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">{isReplace ? '新版 Markdown 稿件 *' : 'Markdown 稿件 *'}</label>
            <input type="file" accept=".md" ref={fileRef} onChange={handleFile} className="form-file" />
            {fileName && <div className="form-hint">已选择：{fileName}</div>}
          </div>

          {!isReplace && (
            <>
              <div className="form-group">
                <label className="form-label">栏目标题 *</label>
                <input
                  type="text"
                  placeholder="如：政治哲学"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">副标题</label>
                <input
                  type="text"
                  placeholder="如：阿伦特与行动理论"
                  value={form.subtitle}
                  onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">索引词</label>
                <input
                  type="text"
                  placeholder="用 · 分隔"
                  value={form.desc}
                  onChange={e => setForm(f => ({ ...f, desc: e.target.value }))}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">文件名（英文）</label>
                <input
                  type="text"
                  placeholder="自动从文件名生成"
                  value={form.filename}
                  onChange={e => setForm(f => ({ ...f, filename: e.target.value }))}
                  className="form-input"
                />
                <div className="form-hint">src/data/{form.filename || '...'}.md</div>
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">上传密码 *</label>
            <input
              type="password"
              placeholder="输入上传密码"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className="form-input"
            />
          </div>

          {status.msg && <div className={`form-status ${status.type}`}>{status.msg}</div>}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? '送印中' : isReplace ? '替换正文' : '提交栏目'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [activeId, setActiveId] = useState(plans[0]?.id || '')
  const [dark, setDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' ||
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
    }
    return false
  })
  const [showTop, setShowTop] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [uploadMode, setUploadMode] = useState('create')

  const activeIndex = Math.max(0, plans.findIndex(p => p.id === activeId))
  const activePlan = plans[activeIndex] || plans[0]

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 520)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const switchPlan = useCallback((id) => {
    setActiveId(id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const openEditor = (mode) => {
    setUploadMode(mode)
    setShowUpload(true)
  }

  return (
    <div className="app">
      <aside className="sidebar" aria-label="栏目索引">
        <div className="sidebar-header">
          <div className="sidebar-kicker">The Reading Gazette</div>
          <div className="sidebar-title">阅读计划</div>
          <div className="sidebar-sub">Index of Columns</div>
        </div>
        <nav className="sidebar-nav">
          {plans.map((plan, index) => (
            <button
              key={plan.id}
              className={`nav-item ${activeId === plan.id ? 'active' : ''}`}
              onClick={() => switchPlan(plan.id)}
            >
              <span className="nav-number">{pad2(index + 1)}</span>
              <span className="nav-copy">
                <span className="nav-label">{plan.title}</span>
                {plan.subtitle && <span className="nav-sub">{plan.subtitle}</span>}
                {plan.desc && <span className="nav-desc">{plan.desc}</span>}
              </span>
            </button>
          ))}
          <button className="nav-add" onClick={() => openEditor('create')}>
            <span className="nav-number">+</span>
            <span className="nav-label">新增栏目</span>
          </button>
          <button className="nav-add nav-revise" onClick={() => openEditor('replace')}>
            <span className="nav-number">↻</span>
            <span className="nav-label">更新栏目</span>
          </button>
        </nav>
        <div className="sidebar-footer">
          <button className="theme-toggle" onClick={() => setDark(d => !d)}>
            <span className="theme-swatch" />
            {dark ? '夜读版' : '日读版'}
          </button>
        </div>
      </aside>

      <header className="mobile-header">
        <div className="mobile-bar">
          <span className="mobile-title">阅读计划</span>
          <div className="mobile-actions">
            <button className="mobile-btn" onClick={() => openEditor('create')} aria-label="新增栏目">+</button>
            <button className="mobile-btn" onClick={() => openEditor('replace')} aria-label="更新栏目">↻</button>
            <button className="mobile-btn" onClick={() => setDark(d => !d)}>{dark ? '夜' : '日'}</button>
          </div>
        </div>
        <div className="mobile-tabs">
          {plans.map((plan, index) => (
            <button
              key={plan.id}
              className={`mobile-tab ${activeId === plan.id ? 'active' : ''}`}
              onClick={() => switchPlan(plan.id)}
            >
              {pad2(index + 1)} {plan.title}
            </button>
          ))}
        </div>
      </header>

      <main className="main">
        <article className="content">
          <header className="masthead">
            <div className="edition-line">
              <span>Personal Research Newspaper</span>
              <span>{formatIssueDate(activePlan)}</span>
              <span>Vol. {pad2(plans.length)}</span>
            </div>
            <div className="masthead-title">阅读计划</div>
            <div className="masthead-subtitle">THE READING GAZETTE</div>
          </header>

          <section className="article-head">
            <div className="article-meta">
              <span>Column No. {pad2(activeIndex + 1)}</span>
              <span>{pad2(plans.length)} Columns Filed</span>
            </div>
            <h1 className="plan-title">{activePlan.title}</h1>
            {activePlan.subtitle && <p className="plan-subtitle">{activePlan.subtitle}</p>}
            {activePlan.desc && <p className="plan-keywords">{activePlan.desc}</p>}
          </section>

          <div className="markdown-body">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                blockquote({ children }) {
                  return <blockquote className="summary-box">{children}</blockquote>
                },
              }}
            >
              {activePlan.content}
            </ReactMarkdown>
          </div>
        </article>
      </main>

      <button
        className={`scroll-top ${showTop ? 'visible' : ''}`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="回到顶部"
      >
        ↑
      </button>

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          initialMode={uploadMode}
          initialPlanId={activeId}
        />
      )}
    </div>
  )
}
