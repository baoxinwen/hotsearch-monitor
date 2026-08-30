import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import type { HotSearchItem } from '../../types'
import { formatScore } from '../../lib/format'
import { highlightParts } from '../../lib/live'
import { useRefreshPlatform } from '../../lib/queries'
import { Spinner } from '../../components/ui'

const DEFAULT_VISIBLE = 10

/** 平台卡片：瀑布流内使用，默认 10 条可展开 */
export function PlatformCard({
  platform,
  name,
  color,
  items,
  query = '',
}: {
  platform: string
  name: string
  color: string
  items: HotSearchItem[]
  query?: string
}) {
  const [expanded, setExpanded] = useState(false)
  const refresh = useRefreshPlatform()
  const visible = expanded ? items : items.slice(0, DEFAULT_VISIBLE)
  const more = items.length > DEFAULT_VISIBLE

  return (
    <section className="card mb-4 break-inside-avoid overflow-hidden">
      <header className="flex items-center gap-2 border-b border-hair-soft px-3.5 py-2.5">
        <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: color, boxShadow: '0 0 0 1px var(--c-hair)' }} />
        <h3 className="text-[13.5px] font-semibold text-ink">{name}</h3>
        <span className="tnum ml-auto rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-mute">
          {items.length}
        </span>
        <button
          onClick={() => refresh.mutate(platform)}
          disabled={refresh.isPending}
          aria-label={`刷新 ${name}`}
          className="text-ash transition-colors hover:text-ink disabled:opacity-40"
        >
          {refresh.isPending ? <Spinner size={12} /> : <RefreshCw size={12} />}
        </button>
      </header>
      <div>
        {visible.map((item, i) => (
          <div
            key={item.id || i}
            className="group flex items-center gap-2.5 border-b border-hair-soft px-3.5 py-[7px] last:border-b-0 hover:bg-surface-2"
          >
            <span
              className={`tnum flex h-[18px] w-[20px] flex-shrink-0 items-center justify-center rounded-xs text-[10px] ${
                i < 3 ? 'bg-accent font-bold text-on-accent' : 'font-semibold text-mute'
              }`}
            >
              {item.rank}
            </span>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-0 flex-1 truncate text-[13px] text-body group-hover:text-ink"
            >
              {highlightParts(item.title, query).map((p, j) =>
                p.hit ? <mark key={j}>{p.text}</mark> : <span key={j}>{p.text}</span>,
              )}
            </a>
            {item.score > 0 && (
              <span className="tnum flex-shrink-0 text-[11px] text-mute">{formatScore(item.score)}</span>
            )}
          </div>
        ))}
      </div>
      {more && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full py-2 text-center text-xs font-semibold text-link transition-colors hover:bg-surface-2"
        >
          {expanded ? '收起' : `展开剩余 ${items.length - DEFAULT_VISIBLE} 条`}
        </button>
      )}
    </section>
  )
}
