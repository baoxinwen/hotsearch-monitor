import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { LayoutGrid, Rows3, Search, X } from 'lucide-react'
import { useConfig, useHotsearch, usePlatforms, useRankChanges } from '../../lib/queries'
import { useUIStore } from '../../lib/store'
import { filterByPlatforms, mergeFeed } from '../../lib/live'
import { MergedFeed } from './MergedFeed'
import { PlatformBoard } from './PlatformBoard'
import { PlatformPicker } from '../../components/app/PlatformPicker'
import { DisabledBanner } from '../../components/app/DisabledBanner'
import { Button, EmptyState, Skeleton } from '../../components/ui'

/**
 * 实时热搜（监控台首页）
 * 单行统计 + 禁用横幅 + 双视图（聚合流 / 分平台）+ 搜索（URL ?q= 同步，300ms 防抖）
 */
export function LivePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const urlQuery = searchParams.get('q') ?? ''
  const [input, setInput] = useState(urlQuery)

  const intervalSec = useConfig().data?.update_interval
  void intervalSec
  const { data, isLoading, isError, refetch } = useHotsearch()
  const { data: platforms } = usePlatforms()
  const { data: rankChanges } = useRankChanges()
  const view = useUIStore((s) => s.liveView)
  const setView = useUIStore((s) => s.setLiveView)
  const density = useUIStore((s) => s.density)
  const setDensity = useUIStore((s) => s.setDensity)
  const platformFilter = useUIStore((s) => s.platformFilter)

  // 输入防抖 300ms 同步到 URL（可分享/可后退）
  useEffect(() => {
    const t = setTimeout(() => {
      const q = input.trim()
      setSearchParams(q ? { q } : {}, { replace: true })
    }, 300)
    return () => clearTimeout(t)
  }, [input, setSearchParams])

  const scoped = useMemo(
    () => (data ? filterByPlatforms(data.data, platformFilter) : {}),
    [data, platformFilter],
  )
  const feedItems = useMemo(() => mergeFeed(scoped), [scoped])

  const total = feedItems.length
  const activePlatforms = Object.keys(scoped).length
  const allPlatforms = Object.keys(platforms?.platforms ?? {}).length
  const disabledCount = data?.disabled_platforms.length ?? 0

  if (isError) {
    return (
      <EmptyState
        title="数据更新失败"
        description="无法连接到后端服务，或服务端开启了 API Key 认证（需在设置中配置）。当前可能显示缓存数据。"
        action={<Button variant="primary" onClick={() => void refetch()}>重试</Button>}
      />
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4 p-4 sm:p-6">
        <Skeleton className="h-9 w-full" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col fade-in">
      {/* 工具行 */}
      <div className="flex flex-wrap items-center gap-2 px-4 pt-4 sm:px-6">
        <div className="relative min-w-[220px] flex-1 sm:max-w-md">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ash" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="搜索标题，多关键词用空格分隔，按 / 聚焦"
            aria-label="搜索热搜标题"
            data-hotsearch-input
            className="input pr-8 pl-8"
          />
          {input && (
            <button
              onClick={() => setInput('')}
              aria-label="清除搜索"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ash hover:text-ink"
            >
              <X size={13} />
            </button>
          )}
        </div>
        <PlatformPicker />
        <div className="flex-1" />
        <div className="flex items-center gap-0.5 rounded-md border border-hair-soft bg-surface-2 p-0.5">
          <ViewSegBtn active={view === 'feed'} onClick={() => setView('feed')} icon={<Rows3 size={13} />} label="聚合流" />
          <ViewSegBtn active={view === 'board'} onClick={() => setView('board')} icon={<LayoutGrid size={13} />} label="分平台" />
        </div>
        <div className="hidden items-center gap-0.5 rounded-md border border-hair-soft bg-surface-2 p-0.5 sm:flex">
          <ViewSegBtn active={density === 'cozy'} onClick={() => setDensity('cozy')} label="舒适" />
          <ViewSegBtn active={density === 'compact'} onClick={() => setDensity('compact')} label="紧凑" />
        </div>
      </div>

      {/* 统计条 + 横幅 */}
      <div className="px-4 pt-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-mute">
          <span>共 <b className="tnum text-ink">{total.toLocaleString()}</b> 条</span>
          <span className="text-ash">·</span>
          <span><b className="tnum text-ink">{activePlatforms}</b>/{allPlatforms} 平台</span>
          {disabledCount > 0 && (
            <>
              <span className="text-ash">·</span>
              <span className="rounded-full bg-down/10 px-2 py-0.5 text-xs font-semibold text-down">
                <b className="tnum">{disabledCount}</b> 个已禁用
              </span>
            </>
          )}
        </div>
        <div className="mt-3">
          <DisabledBanner />
        </div>
      </div>

      {/* 内容区 */}
      {view === 'feed' ? (
        <MergedFeed items={feedItems} query={urlQuery} changes={rankChanges} onClearSearch={() => setInput('')} />
      ) : (
        <PlatformBoard data={scoped} query={urlQuery} />
      )}
    </div>
  )
}

function ViewSegBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon?: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex h-7 items-center gap-1.5 rounded-sm px-2.5 text-xs font-semibold transition-colors ${
        active ? 'bg-surface text-ink shadow-card' : 'text-mute hover:text-body'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}
