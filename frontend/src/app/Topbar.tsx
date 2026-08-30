import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Menu, Moon, RefreshCw, Search, Sun } from 'lucide-react'
import { Button, Kbd, Spinner } from '../components/ui'
import { Tooltip } from '../components/overlay'
import { useHotsearch } from '../lib/queries'
import { formatCountdown, parseLocalDateTime } from '../lib/format'
import { qk } from '../lib/queries'
import { useQueryClient } from '@tanstack/react-query'

const TITLES: Record<string, string> = {
  '/': '实时热搜',
  '/insights': '趋势分析',
  '/archive': '历史快照',
  '/settings': '设置',
}

/** 更新状态：相对时间 + 下次刷新倒计时 + 进行中/失败指示 */
export function UpdateStatus() {
  const { data, isFetching, isError, dataUpdatedAt } = useHotsearch()

  let text = '等待数据…'
  if (isError) {
    text = '更新失败，显示的可能不是最新数据'
  } else if (data?.update_time) {
    const last = parseLocalDateTime(data.update_time)
    const fetchBase = dataUpdatedAt || Date.now()
    if (last) {
      const elapsed = (Date.now() - fetchBase) / 1000
      const remain = Math.max(0, 300 - elapsed)
      text = `更新于 ${data.update_time.slice(11, 16)}${remain > 0 ? ` · 下次刷新 ${formatCountdown(remain)}` : ''}`
    } else {
      text = `更新于 ${data.update_time.slice(11, 16)}`
    }
  }

  return (
    <span className={`hidden items-center gap-2 text-xs md:inline-flex ${isError ? 'text-warn' : 'text-mute'}`} title={data?.update_time}>
      {isFetching ? (
        <>
          <Spinner size={12} className="text-accent" />
          <span className="text-accent">正在更新…</span>
        </>
      ) : isError ? (
        <>
          <span className="h-[7px] w-[7px] rounded-full bg-warn" />
          <span>{text}</span>
        </>
      ) : (
        <>
          <span className="h-[7px] w-[7px] rounded-full bg-up" />
          <span className="tnum">{text}</span>
        </>
      )}
    </span>
  )
}

function useTickerMs(intervalMs = 1000) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return [Date.now(), setTick] as const
}

export function Topbar({
  onOpenMenu,
  onOpenPalette,
  isDark,
  onToggleTheme,
}: {
  onOpenMenu: () => void
  onOpenPalette: () => void
  isDark: boolean
  onToggleTheme: () => void
}) {
  const { pathname } = useLocation()
  const qc = useQueryClient()
  const title = TITLES[pathname] ?? (pathname.startsWith('/archive') ? '历史快照' : '')

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-hair-soft bg-[color-mix(in_srgb,var(--c-canvas)_82%,transparent)] px-4 backdrop-blur-md">
      <button
        onClick={onOpenMenu}
        aria-label="打开菜单"
        className="grid h-8 w-8 place-items-center rounded-md text-body hover:bg-surface-2 lg:hidden"
      >
        <Menu size={17} />
      </button>

      <h1 className="text-[15px] font-bold tracking-tight text-ink">{title}</h1>

      <div className="flex-1" />

      <UpdateStatus />

      <Tooltip content="刷新全部平台（R）">
        <Button variant="ghost" size="icon" aria-label="刷新" onClick={() => void qc.invalidateQueries({ queryKey: qk.hotsearch })}>
          <RefreshCw size={15} />
        </Button>
      </Tooltip>

      <Tooltip content="命令面板（Ctrl+K）">
        <button
          onClick={onOpenPalette}
          className="hidden h-8 items-center gap-1.5 rounded-md border border-hair bg-surface px-2 text-xs text-mute transition-colors hover:border-mute hover:text-ink sm:inline-flex"
        >
          <Search size={13} />
          <Kbd>⌘K</Kbd>
        </button>
      </Tooltip>

      <Tooltip content={isDark ? '切换亮色（T）' : '切换暗色（T）'}>
        <Button variant="ghost" size="icon" aria-label="切换主题" onClick={onToggleTheme}>
          {isDark ? <Sun size={15} /> : <Moon size={15} />}
        </Button>
      </Tooltip>
    </header>
  )
}
