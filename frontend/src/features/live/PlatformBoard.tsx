import { useUIStore } from '../../lib/store'
import { usePlatforms } from '../../lib/queries'
import { PlatformCard } from './PlatformCard'
import { EmptyState } from '../../components/ui'
import { LayoutGrid } from 'lucide-react'
import { matchKeywords } from '../../lib/live'

/** 分平台瀑布流（CSS columns，卡片高度自适应，修复同行拉伸问题） */
export function PlatformBoard({
  data,
  query,
}: {
  data: Record<string, import('../../types').HotSearchItem[]>
  query: string
}) {
  const { data: platforms } = usePlatforms()
  const categoryOf = (p: string) => platforms?.platforms[p]?.category ?? ''

  const entries = Object.entries(data)
  // 按分类分组展示
  const byCategory = new Map<string, [string, import('../../types').HotSearchItem[]][]>()
  for (const [p, items] of entries) {
    if (!items.length) continue
    const cat = categoryOf(p)
    if (!byCategory.has(cat)) byCategory.set(cat, [])
    byCategory.get(cat)!.push([p, items])
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={<LayoutGrid size={36} strokeWidth={1.5} />}
        title="暂无数据"
        description="当前筛选下没有平台数据，请调整平台筛选或稍后刷新"
      />
    )
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 sm:px-6">
      {Array.from(byCategory.entries()).map(([cat, ps]) => (
        <section key={cat} className="mb-6">
          <h2 className="mb-3 px-1 text-[13px] font-bold uppercase tracking-wide text-mute">{cat}</h2>
          <div className="columns-1 gap-4 md:columns-2 xl:columns-3">
            {ps.map(([p, items]) => (
              <PlatformCard
                key={p}
                platform={p}
                name={platforms?.platforms[p]?.name ?? p}
                color={platforms?.platforms[p]?.color ?? '#888'}
                items={items.filter((x) => matchKeywords(x.title, query))}
                query={query}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
