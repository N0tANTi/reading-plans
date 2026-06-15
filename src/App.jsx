import { useState, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import politicsMd from './data/politics.md?raw'
import aestheticsMd from './data/aesthetics.md?raw'
import subjectivityMd from './data/subjectivity.md?raw'

const plans = [
  {
    id: 'politics',
    icon: '🏛',
    title: '政治哲学',
    subtitle: '阿伦特与行动理论',
    desc: 'The Human Condition · 诞生性 · 计算性思考',
    content: politicsMd,
  },
  {
    id: 'aesthetics',
    icon: '🎭',
    title: '美学',
    subtitle: '本雅明·寄喻与悲苦剧',
    desc: '德意志悲苦剧的起源 · 废墟 · 忧郁',
    content: aestheticsMd,
  },
  {
    id: 'subjectivity',
    icon: '🪞',
    title: '主体性研究',
    subtitle: '断裂与叙事',
    desc: '费希特 · 拉康 · 利科 · 齐泽克',
    content: subjectivityMd,
  },
]

export default function App() {
  const [activeId, setActiveId] = useState('politics')
  const [dark, setDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' ||
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
    }
    return false
  })
  const [showTop, setShowTop] = useState(false)

  const activePlan = plans.find(p => p.id === activeId)

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
            <div
              key={plan.id}
              className={`nav-item ${activeId === plan.id ? 'active' : ''}`}
              onClick={() => switchPlan(plan.id)}
            >
              <span className="nav-icon">{plan.icon}</span>
              <div>
                <div className="nav-label">{plan.title}</div>
                <div className="nav-desc">{plan.desc}</div>
              </div>
            </div>
          ))}
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
          <button className="mobile-theme-btn" onClick={() => setDark(d => !d)}>
            {dark ? '☀️' : '🌙'}
          </button>
        </div>
        <div className="mobile-tabs">
          {plans.map(plan => (
            <button
              key={plan.id}
              className={`mobile-tab ${activeId === plan.id ? 'active' : ''}`}
              onClick={() => switchPlan(plan.id)}
            >
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
            <h1 className="plan-title">{activePlan.title}<span style={{
              fontWeight: 400, fontSize: '0.6em', marginLeft: '12px',
              color: 'var(--text-tertiary)'
            }}>
              {activePlan.subtitle}
            </span></h1>
            <div className="plan-meta">{activePlan.desc}</div>
          </div>
          <div className="markdown-body">
            <ReactMarkdown>{activePlan.content}</ReactMarkdown>
          </div>
        </div>
      </main>

      {/* Scroll to top */}
      <button
        className={`scroll-top ${showTop ? 'visible' : ''}`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="回到顶部"
      >
        ↑
      </button>
    </div>
  )
}
