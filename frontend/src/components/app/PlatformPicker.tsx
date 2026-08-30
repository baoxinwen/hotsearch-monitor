import { useMemo, useState } from 'react'
import { ChevronDown, LayoutGrid, Search } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '../overlay'
import { Button, Chip, Dot } from '../ui'
import { usePlatforms } from '../../lib/queries'
import { useUIStore } from '../../lib/store'

/** 平台多选弹层：搜索 + 分类分组 + 分类全选 + 全部/清空 */
export function PlatformPicker() {
  const { data } = usePlatforms()
  const filter = useUIStore((s) => s.platformFilter)
  const setFilter = useUIStore((s) => s.setPlatformFilter)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)

  const allPlatforms = useMemo(() => Object.keys(data?.platforms ?? {}), [data])
  const isAll = filter.length === 0
  const countText = isAll ? `全部 ${allPlatforms.length}` : `${filter.length}/${allPlatforms.length}`

  const togglePlatform = (p: string) => {
    // 空筛选 = 全选；首次取消某个平台时，从全集中扣除
    const base = isAll ? allPlatforms : filter
    setFilter(base.includes(p) ? base.filter((x) => x !== p) : [...base, p])
  }
  const toggleCategory = (ps: string[]) => {
    const base = isAll ? allPlatforms : filter
    const allSel = ps.every((p) => base.includes(p))
    setFilter(allSel ? base.filter((p) => !ps.includes(p)) : [...new Set([...base, ...ps])])
  }

  const categories = useMemo(() => {
    const cats = data?.categories ?? {}
    if (!q.trim()) return Object.entries(cats)
    const kw = q.trim().toLowerCase()
    return Object.entries(cats)
      .map(([c, ps]) => [c, ps.filter((p) => (data?.platforms[p]?.name ?? p).toLowerCase().includes(kw))] as const)
      .filter(([, ps]) => ps.length > 0)
  }, [data, q])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button aria-label="平台筛选">
          <LayoutGrid size={14} />
          平台筛选
          <span className="tnum font-semibold text-ink">{countText}</span>
          <ChevronDown size={13} className="text-ash" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(520px,92vw)]">
        <div className="relative mb-2">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ash" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索平台…"
            className="input pl-8"
          />
        </div>

        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-ash">
            {isAll ? '当前显示全部平台' : `已选 ${filter.length} 个平台`}
          </span>
          <div className="flex gap-1.5">
            <Button size="sm" variant="ghost" onClick={() => setFilter([])}>全部</Button>
            <Button size="sm" variant="ghost" onClick={() => setFilter(allPlatforms)}>反选全部</Button>
          </div>
        </div>

        <div className="space-y-3">
          {categories.map(([cat, ps]) => {
            const catAll = ps.every((p) => (isAll ? true : filter.includes(p)))
            return (
              <div key={cat}>
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-ash">{cat}</span>
                  <button
                    onClick={() => toggleCategory(ps)}
                    className="text-[11.5px] font-semibold text-link hover:underline"
                  >
                    {catAll ? '取消' : '全选'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ps.map((p) => {
                    const cfg = data?.platforms[p]
                    const selected = isAll || filter.includes(p)
                    return (
                      <Chip key={p} selected={selected} onToggle={() => togglePlatform(p)}>
                        <Dot color={cfg?.color ?? '#888'} size={6} />
                        {cfg?.name ?? p}
                      </Chip>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
