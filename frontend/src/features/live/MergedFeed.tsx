import { useMemo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { HotSearchItem } from '../../types'
import { heatBarWidth, highlightParts, matchKeywords } from '../../lib/live'
import { formatScore } from '../../lib/format'
import { usePlatforms } from '../../lib/queries'
import { useUIStore } from '../../lib/store'
import { EmptyState } from '../../components/ui'
import { SearchX } from 'lucide-react'

/**
 * 聚合热榜流：全部平台条目按热度合并，虚拟滚动渲染
 */
export function MergedFeed({
  items,
  query,
  changes,
  onClearSearch,
}: {
  items: HotSearchItem[]
  query: string
  changes?: Record<string, { delta: number; status: 'up' | 'down' | 'new' }>
  onClearSearch: () => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const { data: platforms } = usePlatforms()
  const density = useUIStore((s) => s.density)
  const rowHeight = density === 'compact' ? 34 : 44

  const visible = useMemo(() => items.filter((x) => matchKeywords(x.title, query)), [items, query])

  const virtualizer = useVirtualizer({
    count: visible.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 12,
  })

  const scores = useMemo(() => visible.filter((x) => x.score > 0).map((x) => x.score), [visible])
  const maxScore = scores.length ? Math.max(...scores) : 0

  if (visible.length === 0) {
    return (
      <div className="flex-1">
        <EmptyState
          icon={<SearchX size={36} strokeWidth={1.5} />}
          title={query ? `没有匹配「${query}」的热搜` : '暂无数据'}
          description={query ? '换个关键词试试，或检查拼写' : '请稍后刷新或检查网络连接'}
          action={
            query ? (
              <button onClick={onClearSearch} className="text-[13px] font-semibold text-link hover:underline">
                清除搜索
              </button>
            ) : undefined
          }
        />
      </div>
    )
  }

  return (
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-6">
      <div className="card overflow-visible" style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((vRow) => {
          const item = visible[vRow.index]
          const cfg = platforms?.platforms[item.platform]
          return (
            <div
              key={item.id + vRow.index}
              ref={virtualizer.measureElement}
              data-index={vRow.index}
              className="absolute inset-x-0 flex items-center gap-3 border-b border-hair-soft px-3.5 last:border-b-0 sm:px-4"
              style={{
                height: rowHeight,
                transform: `translateY(${vRow.start}px)`,
                background: 'transparent',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--c-surface-2)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <RankBadge rank={vRow.index + 1} />
              <span className="flex w-[84px] flex-shrink-0 items-center gap-1.5 overflow-hidden whitespace-nowrap text-xs font-medium text-mute">
                <span
                  aria-hidden
                  className="inline-block h-[7px] w-[7px] flex-shrink-0 rounded-full"
                  style={{ background: cfg?.color ?? '#888', boxShadow: '0 0 0 1px var(--c-hair)' }}
                />
                {cfg?.name ?? item.platform}
              </span>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 flex-1 truncate text-[var(--fs-title)] text-ink hover:text-link"
                style={{ fontWeight: 480 }}
              >
                {highlightParts(item.title, query).map((p, i) =>
                  p.hit ? <mark key={i}>{p.text}</mark> : <span key={i}>{p.text}</span>,
                )}
              </a>
              <DeltaBadge change={changes?.[`${item.platform}|${item.title}`]} />
              <span className="flex w-[118px] flex-shrink-0 items-center justify-end gap-2">
                <b className="tnum w-[52px] text-right text-xs font-semibold text-body">
                  {item.score > 0 ? formatScore(item.score) : item.hot_display || ''}
                </b>
                <span className="hidden h-1 w-[52px] overflow-hidden rounded-full bg-hair-soft sm:block">
                  <span
                    className="block h-full rounded-full bg-accent"
                    style={{ width: heatBarWidth(item.score, maxScore) }}
                  />
                </span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function RankBadge({ rank }: { rank: number }) {
  const top = rank <= 3
  return (
    <span
      className={`tnum flex h-[22px] w-[26px] flex-shrink-0 items-center justify-center rounded-xs text-[11px] ${
        top ? 'bg-accent font-bold text-on-accent' : 'font-semibold text-mute'
      }`}
    >
      {rank}
    </span>
  )
}

/** 与上一快照的排名变化：↑2 绿 / ↓1 红 / 新 琥珀 */
function DeltaBadge({ change }: { change?: { delta: number; status: 'up' | 'down' | 'new' } }) {
  if (!change) return <span className="w-[38px] flex-shrink-0" />
  if (change.status === 'new') {
    return (
      <span className="flex w-[38px] flex-shrink-0 justify-end">
        <span className="rounded-full bg-accent px-1.5 py-px text-[10.5px] font-bold text-on-accent">新</span>
      </span>
    )
  }
  const up = change.status === 'up'
  return (
    <span className="flex w-[38px] flex-shrink-0 justify-end">
      <span
        className={`tnum rounded-full px-1.5 py-px text-[10.5px] font-bold ${
          up ? 'bg-up/10 text-up' : 'bg-down/10 text-down'
        }`}
      >
        {up ? '↑' : '↓'}
        {change.delta}
      </span>
    </span>
  )
}
