import { Children, isValidElement, useState, useEffect, useCallback, useRef } from 'react'
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
  const dialogRef = useRef(null)
  useEffect(() => {
    const previous = document.activeElement
    const dialog = dialogRef.current
    dialog.querySelector('button')?.focus()
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
      if (event.key !== 'Tab') return
      const controls = [...dialog.querySelectorAll('button, input, select, textarea')].filter(el => !el.disabled && el.getClientRects().length)
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus() }
      if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0]?.focus() }
    }
    dialog.addEventListener('keydown', onKey)
    return () => { dialog.removeEventListener('keydown', onKey); previous?.focus() }
  }, [onClose])
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
      <div className="modal" ref={dialogRef} role="dialog" aria-modal="true" aria-label="编辑阅读栏目" onClick={e => e.stopPropagation()}>
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
  const [activeId, setActiveId] = useState(() => { const id = new URLSearchParams(location.search).get('plan'); return plans.some(p => p.id === id) ? id : plans[0]?.id || '' })
  const [dark, setDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' ||
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
    }
    return false
  })
  const [query, setQuery] = useState('')
  const [fontSize, setFontSize] = useState(18)
  const [focus, setFocus] = useState(false)
  const [headings, setHeadings] = useState([])
  const articleRef = useRef(null)
  const [showUpload, setShowUpload] = useState(false)
  const [uploadMode, setUploadMode] = useState('create')

  const activeIndex = Math.max(0, plans.findIndex(p => p.id === activeId))
  const activePlan = plans[activeIndex] || plans[0]

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => {
    const nodes = [...articleRef.current.querySelectorAll('h2, h3')]
    nodes.forEach((node, index) => { node.id = 'section-' + index })
    setHeadings(nodes.map(node => ({ id: node.id, title: node.textContent, level: node.tagName })))
    document.title = activePlan.title + ' · 阅读计划'
  }, [activePlan])

  useEffect(() => {
    const restore = () => {
      const id = new URLSearchParams(location.search).get('plan')
      setActiveId(plans.some(p => p.id === id) ? id : plans[0].id)
    }
    window.addEventListener('popstate', restore)
    return () => window.removeEventListener('popstate', restore)
  }, [])

  const switchPlan = useCallback((id) => {
    const url = new URL(location.href)
    url.searchParams.set('plan', id)
    url.hash = ''
    history.pushState({}, '', url)
    setActiveId(id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const openEditor = (mode) => {
    setUploadMode(mode)
    setShowUpload(true)
  }

  return (
    <div className={`app ${focus ? 'focus-reading' : ''}`} style={{ '--reading-size': fontSize + 'px' }}>
      <a className="skip-link" href="#reading-content">跳到正文</a>
      <aside className="sidebar" aria-label="栏目索引">
        <div className="sidebar-header">
          <div className="sidebar-kicker">The Reading Gazette</div>
          <div className="sidebar-title">阅读计划</div>
          <div className="sidebar-sub">Index of Columns</div>
        </div>
        <div className="column-search"><label htmlFor="column-search">查找栏目</label><input id="column-search" type="search" placeholder="标题、作者或关键词" value={query} onChange={e => setQuery(e.target.value)} /></div>
        <nav className="sidebar-nav">
          {plans.map((plan, index) => ({plan, index})).filter(({plan}) => (plan.title + plan.subtitle + plan.desc).toLowerCase().includes(query.trim().toLowerCase())).map(({plan, index}) => (
            <button
              key={plan.id}
              aria-current={activeId === plan.id ? 'page' : undefined}
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
          {!plans.some(p => (p.title + p.subtitle + p.desc).toLowerCase().includes(query.trim().toLowerCase())) && <p className="empty-search" role="status">没有匹配的栏目。<button onClick={() => setQuery('')}>清除搜索</button></p>}
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
        <div className="reading-toolbar"><a href="/">Archein ↗</a><div><button onClick={() => setFontSize(n => Math.max(16, n - 1))} disabled={fontSize <= 16} aria-label="缩小字号">A−</button><span aria-live="polite">{fontSize}</span><button onClick={() => setFontSize(n => Math.min(24, n + 1))} disabled={fontSize >= 24} aria-label="增大字号">A＋</button><button aria-pressed={focus} onClick={() => setFocus(v => !v)}>{focus ? '退出专注' : '专注阅读'}</button></div></div>
        <article className="content">
          <header className="masthead">
            <div className="edition-line">
              <span>PERSONAL RESEARCH ARCHIVE</span>
              <span>{formatIssueDate(activePlan)}</span>
              <span>{plans.length} 个阅读栏目</span>
            </div>
            <div className="masthead-title">阅读计划</div>
            <div className="masthead-subtitle">THE READING GAZETTE</div>
          </header>

          <section className="article-head">
            <div className="article-meta">
              <span>Column No. {pad2(activeIndex + 1)}</span>
              <span>约 {Math.max(1, Math.ceil(activePlan.content.length / 500))} 分钟阅读</span>
            </div>
            <h1 className="plan-title">{activePlan.title}</h1>
            {activePlan.subtitle && <p className="plan-subtitle">{activePlan.subtitle}</p>}
            {activePlan.desc && <p className="plan-keywords">{activePlan.desc}</p>}
          </section>

          <details className="article-directory" key={activeId}><summary>文章目录 <span>{headings.length} 个章节</span></summary><nav aria-label="文章目录">{headings.map(h => <a key={h.id} className={h.level === 'H3' ? 'subheading' : ''} href={'#' + h.id}>{h.title}</a>)}</nav></details>
          <div className="markdown-body" id="reading-content" tabIndex={-1} ref={articleRef}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                blockquote({ children }) {
                  return <blockquote className="summary-box">{children}</blockquote>
                },
                p({ children }) {
                  const firstChild = Children.toArray(children)[0]
                  const startsWithStrong = isValidElement(firstChild) && firstChild.type === 'strong'
                  return <p className={startsWithStrong ? 'summary-label-row' : undefined}>{children}</p>
                },
              }}
            >
              {activePlan.content}
            </ReactMarkdown>
          </div>
          <footer className="reading-footer"><span>THE READING GAZETTE</span>{activeIndex < plans.length - 1 && <button onClick={() => switchPlan(plans[activeIndex + 1].id)}>下一栏目：{plans[activeIndex + 1].title} →</button>}</footer>
        </article>
      </main>

      <button
        className="scroll-top visible"
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
