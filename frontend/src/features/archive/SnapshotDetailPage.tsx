import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Download, Search, X } from 'lucide-react'
import { usePlatforms, useSnapshotDetail } from '../../lib/queries'
import { matchKeywords } from '../../lib/live'
import { PlatformCard } from '../live/PlatformCard'
import { Button, EmptyState, Skeleton } from '../../components/ui'
import type { HistorySnapshot } from '../../types'

/** 快照详情：复用监控台平台卡片，支持快照内搜索与 CSV 导出 */
export function SnapshotDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') ?? ''
  const [input, setInput] = useState(q)
  const navigate = useNavigate()
  const { data: snap, isLoading, isError, error } = useSnapshotDetail(id)
  const { data: platforms } = usePlatforms()

  const filteredData = useMemo(() => {
    if (!snap) return {}
    const out: Record<string, import('../../types').HotSearchItem[]> = {}
    for (const [p, items] of Object.entries(snap.data)) {
      const f = q.trim() ? items.filter((x) => matchKeywords(x.title, q)) : items
      if (f.length) out[p] = f
    }
    return out
  }, [snap, q])

  if (isLoading) {
    return (
      <div className="space-y-4 p-4 sm:p-6">
        <Skeleton className="h-9 w-64" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-72" /><Skeleton className="h-72" /><Skeleton className="h-72" />
        </div>
      </div>
    )
  }

  if (isError || !snap) {
    return (
      <EmptyState
        title="快照不存在或已被删除"
        description={(error as Error)?.message}
        action={<Button onClick={() => navigate('/archive')}>返回历史快照</Button>}
      />
    )
  }

  return (
    <div className="fade-in p-4 sm:p-6">
      {/* 头部 */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Link to="/archive" className="inline-flex items-center gap-1 text-[13px] font-semibold text-link hover:underline">
          <ArrowLeft size={14} /> 返回时间线
        </Link>
        <span className="text-ash">/</span>
        <h2 className="tnum text-[17px] font-bold tracking-tight text-ink">
          {snap.date} {snap.time.slice(0, 5)}
        </h2>
        <span className="tnum text-xs text-mute">
          {snap.total_count} 条{snap.filtered_count > 0 && snap.filtered_count !== snap.total_count ? ` · ${snap.filtered_count} 条命中关键词` : ''}
        </span>
        <div className="flex-1" />
        <Button onClick={() => exportCsv(snap)}>
          <Download size={13} /> 导出 CSV
        </Button>
      </div>

      {/* 快照内搜索 */}
      <div className="relative mb-5 max-w-md">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ash" />
        <input
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            setSearchParams(e.target.value.trim() ? { q: e.target.value.trim() } : {}, { replace: true })
          }}
          placeholder="在此快照内搜索标题…"
          className="input pl-8 pr-8"
        />
        {input && (
          <button onClick={() => { setInput(''); setSearchParams({}, { replace: true }) }} aria-label="清除" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ash hover:text-ink">
            <X size={13} />
          </button>
        )}
      </div>

      {/* 平台卡片瀑布流 */}
      {Object.keys(filteredData).length === 0 ? (
        <EmptyState title="没有匹配的条目" description={`快照内没有标题包含「${q}」的热搜`} />
      ) : (
        <div className="columns-1 gap-4 md:columns-2 xl:columns-3">
          {Object.entries(filteredData).map(([p, items]) => (
            <PlatformCard
              key={p}
              platform={p}
              name={platforms?.platforms[p]?.name ?? p}
              color={platforms?.platforms[p]?.color ?? '#888'}
              items={items}
              query={q}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function exportCsv(snap: HistorySnapshot) {
  // 防公式注入：以 = + - @ 或制表符开头的单元格前置单引号
  const esc = (x: string) => {
    let v = (x || '').replace(/"/g, '""').replace(/[\r\n]+/g, ' ')
    if (/^[=+\-@\t]/.test(v)) v = "'" + v
    return `"${v}"`
  }
  let csv = '平台,排名,标题,热度,链接\n'
  for (const [p, items] of Object.entries(snap.data)) {
    for (const i of items) {
      csv += `${esc(p)},${i.rank},${esc(i.title)},${i.score},${esc(i.url)}\n`
    }
  }
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `hotsearch_${snap.date}_${snap.time.slice(0, 8).replace(/:/g, '')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
