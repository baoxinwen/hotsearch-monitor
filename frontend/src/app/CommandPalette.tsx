import { useCallback, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Command } from 'cmdk'
import {
  Archive, LayoutDashboard, Moon, RefreshCw, Rows3, Settings, Sun, TrendingUp, TriangleAlert, Zap,
} from 'lucide-react'
import { qk } from '../lib/queries'
import { useUIStore } from '../lib/store'
import { useHotsearch } from '../lib/queries'
import { useEnablePlatform } from '../lib/queries'
import { useConfig, usePlatforms } from '../lib/queries'

/** 全局快捷键：1-4 切页 / r 刷新 / t 切主题 / d 切密度 / / 聚焦搜索
 *  输入中（含 IME 组合）、命令面板或对话框打开时全部跳过 */
export function useGlobalShortcuts(toggleTheme: () => void) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const setDensity = useUIStore((s) => s.setDensity)
  const density = useUIStore((s) => s.density)
  const paletteOpen = useUIStore((s) => s.paletteOpen)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.isComposing || e.metaKey || e.ctrlKey || e.altKey) return
      const el = document.activeElement as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return
      // 有模态（命令面板 / Radix Dialog）打开时不响应页面级快捷键
      if (paletteOpen || document.querySelector('[role="dialog"][data-state="open"]')) return

      if (e.key === '1') navigate('/')
      else if (e.key === '2') navigate('/insights')
      else if (e.key === '3') navigate('/archive')
      else if (e.key === '4') navigate('/settings')
      else if (e.key === 'r') void qc.invalidateQueries({ queryKey: qk.hotsearch })
      else if (e.key === 't') toggleTheme()
      else if (e.key === 'd') setDensity(density === 'cozy' ? 'compact' : 'cozy')
      else if (e.key === '/') {
        e.preventDefault()
        document.querySelector<HTMLInputElement>('[data-hotsearch-input]')?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate, qc, toggleTheme, density, setDensity, paletteOpen])
}

export function CommandPalette({
  open,
  onOpenChange,
  toggleTheme,
  isDark,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  toggleTheme: () => void
  isDark: boolean
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const qc = useQueryClient()
  const density = useUIStore((s) => s.density)
  const setDensity = useUIStore((s) => s.setDensity)
  const { data: disabled } = useHotsearchDisabled()
  const enablePlatform = useEnablePlatform()

  const run = useCallback(
    (fn: () => void) => {
      onOpenChange(false)
      fn()
    },
    [onOpenChange],
  )

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="命令面板"
      className="fixed left-1/2 top-[14vh] z-[95] w-[min(560px,92vw)] -translate-x-1/2 overflow-hidden rounded-lg border border-hair bg-surface shadow-pop"
      overlayClassName="fixed inset-0 z-[90] bg-[var(--scrim)] backdrop-blur-[2px]"
      shouldFilter
    >
      <Command.Input
        autoFocus
        placeholder="输入命令或搜索平台…"
        className="h-12 w-full border-b border-hair-soft bg-transparent px-4 text-[14px] text-ink outline-none placeholder:text-ash"
      />
      <Command.List className="max-h-[360px] overflow-y-auto p-1.5">
        <Command.Empty className="py-8 text-center text-[13px] text-mute">无匹配结果</Command.Empty>

        <Command.Group heading="页面" className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-ash">
          <Item icon={<LayoutDashboard size={15} />} shortcut="1" selected={location.pathname === '/'} onSelect={() => run(() => navigate('/'))}>实时热搜</Item>
          <Item icon={<TrendingUp size={15} />} shortcut="2" selected={location.pathname === '/insights'} onSelect={() => run(() => navigate('/insights'))}>趋势分析</Item>
          <Item icon={<Archive size={15} />} shortcut="3" selected={location.pathname.startsWith('/archive')} onSelect={() => run(() => navigate('/archive'))}>历史快照</Item>
          <Item icon={<Settings size={15} />} shortcut="4" selected={location.pathname === '/settings'} onSelect={() => run(() => navigate('/settings'))}>设置</Item>
        </Command.Group>

        <Command.Group heading="动作" className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-ash">
          <Item icon={<RefreshCw size={15} />} shortcut="R" onSelect={() => run(() => void qc.invalidateQueries({ queryKey: qk.hotsearch }))}>立即刷新全部平台</Item>
          <Item icon={isDark ? <Sun size={15} /> : <Moon size={15} />} shortcut="T" onSelect={() => run(toggleTheme)}>切换{isDark ? '亮色' : '暗色'}主题</Item>
          <Item icon={<Rows3 size={15} />} shortcut="D" onSelect={() => run(() => setDensity(density === 'cozy' ? 'compact' : 'cozy'))}>
            切换{density === 'cozy' ? '紧凑' : '舒适'}密度
          </Item>
        </Command.Group>

        {disabled && disabled.length > 0 && (
          <Command.Group heading="重新启用已禁用平台" className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-ash">
            {disabled.map((p) => (
              <DisabledItem key={p.key} platform={p.key} name={p.name} onSelect={() => run(() => enablePlatform.mutate(p.key))} />
            ))}
          </Command.Group>
        )}
      </Command.List>
      <div className="flex gap-4 border-t border-hair-soft px-4 py-2 text-[11px] text-ash">
        <span>↑↓ 选择</span>
        <span>↵ 执行</span>
        <span>Esc 关闭</span>
      </div>
    </Command.Dialog>
  )
}

function useHotsearchDisabled() {
  // 保留平台 key（后端 enable 接口只认 key，不认显示名）
  const { data } = useHotsearch()
  const { data: platforms } = usePlatforms()
  if (!data) return { data: undefined }
  return {
    data: data.disabled_platforms.map((key) => ({
      key,
      name: platforms?.platforms[key]?.name ?? key,
    })),
  }
}

function Item({
  icon,
  children,
  shortcut,
  selected,
  onSelect,
}: {
  icon: React.ReactNode
  children: React.ReactNode
  shortcut?: string
  selected?: boolean
  onSelect: () => void
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex h-9 cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-[13.5px] text-body data-[selected=true]:bg-surface-2 data-[selected=true]:text-ink"
    >
      <span className="text-mute">{icon}</span>
      {children}
      {selected && <span className="ml-auto rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold text-accent">当前</span>}
      {shortcut && !selected && <kbd className="ml-auto rounded-xs border border-hair px-1.5 py-0.5 text-[10px] font-semibold text-ash">{shortcut}</kbd>}
    </Command.Item>
  )
}

function DisabledItem({ platform, name, onSelect }: { platform: string; name: string; onSelect: () => void }) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex h-9 cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-[13.5px] text-body data-[selected=true]:bg-surface-2 data-[selected=true]:text-ink"
    >
      <span className="text-down"><TriangleAlert size={15} /></span>
      启用 {name}
      <span className="ml-auto"><Zap size={13} className="text-accent" /></span>
    </Command.Item>
  )
}
