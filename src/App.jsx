import { useState, useEffect, useCallback, useRef } from 'react'
import ReactMarkdown from 'react-markdown'

/* ── Frontmatter parser ─────────────────────── */
function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)
  if (!m) return { meta: {}, content: raw }
  const meta = {}
  m[1].split('\n').forEach(line => {
    const idx = line.indexOf(':')
    if (idx > 0) meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
  })
  return { meta, content: m[2] }
}

/* ── Auto-discover all .md files via glob ───── */
const mdModules = import.meta.glob('./data/*.md', { query: '?raw', import: 'default', eager: true })

const plans = Object.entries(mdModules)
  .map(([path, raw]) => {
    const { meta, content } = parseFrontmatter(raw)
    const filename = path.split('/').pop().replace('.md', '')
    return {
      id: filename,
      icon: meta.icon || '📖',
      title: meta.title || filename,
      subtitle: meta.subtitle || '',
      desc: meta.desc || '',
      order: parseInt(meta.order) || 999,
      content,
    }
  })
  .sort((a, b) => a.order - b.order)

/* ── Upload Modal ───────────────────────────── */
function UploadModal({ open, onClose }) {
  const [form, setForm] = useState({ title: '', subtitle: '', icon: '📖', desc: '', filename: '', password: '' })
  const [fileContent, setFileContent] = useState('')
  const [fileName, setFileName] = useState('')
  const [status, setStatus] = useState({ type: '', msg: '' })
  const [loading, setLoading] = useState(false)
  const fileRef = useRef()

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const baseName = file.name.replace(/\.md$/i, '')
    setForm(f => ({ ...f, filename: baseName }))
    const reader = new FileReader()
    reader.onload = (ev) => {
      let text = ev.target.result
      // Strip existing frontmatter if present
      const fmMatch = text.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n([\s\S]*)$/)
      if (fmMatch) text = fmMatch[1]
      setFileContent(text)
    }
    reader.readAsText(file)
  }

  const handleSubmit = async () => {
    if (!fileContent) return setStatus({ type: 'error', msg: '请选择一个 .md 文件' })
    if (!form.title) return setStatus({ type: 'error', msg: '请填写标题' })
    if (!form.password) return setStatus({ type: 'error', msg: '请输入上传密码' })

    setLoading(true)
    setStatus({ type: '', msg: '' })

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          content: fileContent,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setStatus({ type: 'success', msg: data.message || '上传成功！约1分钟后刷新页面即可看到。' })
        setForm({ title: '', subtitle: '', icon: '📖', desc: '', filename: '', password: form.password })
        setFileContent('')
        setFileName('')
        if (fileRef.current) fileRef.current.value = ''
      } else {
        setStatus({ type: 'error', msg: data.error || '上传失败' })
      }
    } catch (err) {
      setStatus({ type: 'error', msg: '网络错误: ' + err.message })
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">新增阅读计划</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Markdown 文件</label>
            <input type="file" accept=".md" ref={fileRef} onChange={handleFile} className="form-file" />
            {fileName && <div className="form-hint">已选择: {fileName}</div>}
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">标题 *</label>
              <input type="text" placeholder="如：政治哲学" value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="form-input" />
            </div>
            <div className="form-group" style={{ width: 72 }}>
              <label className="form-label">图标</label>
              <input type="text" placeholder="📖" value={form.icon}
                onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} className="form-input" style={{ textAlign: 'center' }} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">副标题</label>
            <input type="text" placeholder="如：阿伦特与行动理论" value={form.subtitle}
              onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} className="form-input" />
          </div>

          <div className="form-group">
            <label className="form-label">简要描述</label>
            <input type="text" placeholder="关键词，用 · 分隔" value={form.desc}
              onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} className="form-input" />
          </div>

          <div className="form-group">
            <label className="form-label">文件名（英文）</label>
            <input type="text" placeholder="自动从文件名生成" value={form.filename}
              onChange={e => setForm(f => ({ ...f, filename: e.target.value }))} className="form-input" />
            <div className="form-hint">保存为 src/data/{form.filename || '...'}.md</div>
          </div>

          <div className="form-group">
            <label className="form-label">上传密码 *</label>
            <input type="password" placeholder="输入上传密码" value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="form-input" />
          </div>

          {status.msg && (
            <div className={`form-status ${status.type}`}>{status.msg}</div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? '上传中...' : '上传并部署'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Main App ───────────────────────────────── */
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

  const activePlan = plans.find(p => p.id === activeId) || plans[0]

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const switchPlan = useCallback((id) => {
    setActiveId(id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  return (
    <div className="app">
      {/* Desktop Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-title">阅读计划</div>
          <div className="sidebar-subtitle">Reading Plans</div>
        </div>
        <nav className="sidebar-nav">
          {plans.map(plan => (
            <div key={plan.id} className={`nav-item ${activeId === plan.id ? 'active' : ''}`}
              onClick={() => switchPlan(plan.id)}>
              <span className="nav-icon">{plan.icon}</span>
              <div>
                <div className="nav-label">{plan.title}</div>
                <div className="nav-desc">{plan.desc}</div>
              </div>
            </div>
          ))}
          <div className="nav-item nav-add" onClick={() => setShowUpload(true)}>
            <span className="nav-icon">＋</span>
            <div>
              <div className="nav-label">新增计划</div>
            </div>
          </div>
        </nav>
        <div className="sidebar-footer">
          <button className="theme-toggle" onClick={() => setDark(d => !d)}>
            <span className="theme-icon">{dark ? '☀️' : '🌙'}</span>
            {dark ? '浅色模式' : '深色模式'}
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="mobile-header">
        <div className="mobile-header-top">
          <span className="mobile-title">阅读计划</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="mobile-theme-btn" onClick={() => setShowUpload(true)}>＋</button>
            <button className="mobile-theme-btn" onClick={() => setDark(d => !d)}>
              {dark ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
        <div className="mobile-tabs">
          {plans.map(plan => (
            <button key={plan.id} className={`mobile-tab ${activeId === plan.id ? 'active' : ''}`}
              onClick={() => switchPlan(plan.id)}>
              {plan.icon} {plan.title}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <main className="main">
        <div className="content">
          <div className="plan-header">
            <span className="plan-emoji">{activePlan.icon}</span>
            <h1 className="plan-title">{activePlan.title}
              {activePlan.subtitle && (
                <span style={{ fontWeight: 400, fontSize: '0.6em', marginLeft: '12px', color: 'var(--text-tertiary)' }}>
                  {activePlan.subtitle}
                </span>
              )}
            </h1>
            <div className="plan-meta">{activePlan.desc}</div>
          </div>
          <div className="markdown-body">
            <ReactMarkdown>{activePlan.content}</ReactMarkdown>
          </div>
        </div>
      </main>

      {/* Scroll to top */}
      <button className={`scroll-top ${showTop ? 'visible' : ''}`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="回到顶部">↑</button>

      {/* Upload Modal */}
      <UploadModal open={showUpload} onClose={() => setShowUpload(false)} />
    </div>
  )
}
