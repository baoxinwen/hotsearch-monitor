import React from 'react'
import { LayoutDashboard, TrendingUp, Clock, Settings, Sun, Moon, RefreshCw, Menu, X } from 'lucide-react'
import type { ViewMode } from '../types'

interface SidebarProps { currentView: ViewMode; onViewChange: (v: ViewMode) => void; isDark: boolean; onThemeToggle: () => void; onRefresh: () => void; loading: boolean }

const NAV: { view: ViewMode; icon: React.ReactNode; label: string }[] = [
  { view: 'dashboard', icon: <LayoutDashboard size={16} strokeWidth={1.5} />, label: '全部热搜' },
  { view: 'analysis', icon: <TrendingUp size={16} strokeWidth={1.5} />, label: '趋势分析' },
  { view: 'history', icon: <Clock size={16} strokeWidth={1.5} />, label: '历史快照' },
  { view: 'settings', icon: <Settings size={16} strokeWidth={1.5} />, label: '设置' },
]

export function Sidebar({ currentView, onViewChange, isDark, onThemeToggle, onRefresh, loading }: SidebarProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      <button onClick={() => setOpen(!open)} className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-p-md"
        style={{ background: 'var(--c-surface)', border: '1px solid var(--c-hair)' }}>
        {open ? <X size={18} style={{ color: 'var(--c-ink)' }} /> : <Menu size={18} style={{ color: 'var(--c-ink)' }} />}
      </button>
      {open && <div className="lg:hidden fixed inset-0 bg-black/30 z-30" onClick={() => setOpen(false)} />}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-56 flex flex-col transform transition-transform lg:transform-none ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        style={{ background: 'var(--c-surface)', borderRight: '1px solid var(--c-hair)' }}>

        {/* Logo 区域 */}
        <div className="flex items-center gap-2.5 p-5 pb-6">
          <div className="w-7 h-7 rounded-p-sm flex items-center justify-center" style={{ background: 'var(--c-primary)', boxShadow: '0 2px 8px rgba(247,165,1,0.2)' }}>
            <span style={{ color: '#23251d', fontSize: '12px', fontWeight: 700 }}>H</span>
          </div>
          <h1 className="t-heading" style={{ fontSize: '16px', letterSpacing: '-0.3px' }}>热搜监控</h1>
        </div>

        {/* 导航 */}
        <nav className="flex-1 px-3 space-y-0.5">
          {NAV.map(({ view, icon, label }) => {
            const active = currentView === view
            return (
              <button key={view} onClick={() => { onViewChange(view); setOpen(false) }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-p-sm transition-all duration-150 relative"
                style={{
                  fontSize: '14px', fontWeight: active ? 600 : 400,
                  color: active ? 'var(--c-ink)' : 'var(--c-body)',
                  background: active ? 'var(--c-surface-soft)' : 'transparent',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--c-surface-soft)' }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}>
                {/* 选中态左侧高亮条 */}
                {active && <span className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full" style={{ background: 'var(--c-primary)' }} />}
                {icon}{label}
              </button>
            )
          })}
        </nav>

        {/* 底部操作 */}
        <div className="p-3 space-y-1" style={{ borderTop: '1px solid var(--c-hair)' }}>
          <button onClick={onRefresh} disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-p-sm transition-colors disabled:opacity-40 t-body"
            onMouseEnter={e => e.currentTarget.style.background = 'var(--c-surface-soft)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />刷新数据
          </button>
          <button onClick={onThemeToggle}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-p-sm transition-colors t-body"
            onMouseEnter={e => e.currentTarget.style.background = 'var(--c-surface-soft)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            {isDark ? <Sun size={14} /> : <Moon size={14} />}{isDark ? '亮色模式' : '暗色模式'}
          </button>
        </div>
      </aside>
    </>
  )
}
