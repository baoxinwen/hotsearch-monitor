import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { CommandPalette, useGlobalShortcuts } from './CommandPalette'
import { useTheme } from '../hooks/useTheme'
import { useUIStore } from '../lib/store'

export function Shell() {
  const paletteOpen = useUIStore((s) => s.paletteOpen)
  const setPaletteOpen = useUIStore((s) => s.setPaletteOpen)
  const [menuOpen, setMenuOpen] = useState(false)
  const { isDark, toggle } = useTheme()
  const { pathname } = useLocation()

  useGlobalShortcuts(toggle)

  // 路由变化时收起移动端抽屉、滚动回顶部
  useEffect(() => setMenuOpen(false), [pathname])
  useEffect(() => {
    document.querySelector('main')?.scrollTo({ top: 0 })
  }, [pathname])

  // Ctrl/Cmd+K 打开命令面板
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(!paletteOpen)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      {/* 桌面侧栏（flex 拉伸使 aside 占满全高） */}
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {/* 移动端抽屉 */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-[var(--scrim)]" onClick={() => setMenuOpen(false)} />
          <div className="absolute inset-y-0 left-0 shadow-pop">
            <Sidebar onNavigate={() => setMenuOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          onOpenMenu={() => setMenuOpen(true)}
          onOpenPalette={() => setPaletteOpen(true)}
          isDark={isDark}
          onToggleTheme={toggle}
        />
        <main className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} toggleTheme={toggle} isDark={isDark} />
    </div>
  )
}
