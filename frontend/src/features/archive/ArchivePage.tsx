import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQueries } from '@tanstack/react-query'
import { Archive, ChevronRight, Loader2, Trash2 } from 'lucide-react'
import { API } from '../../lib/api'
import { qk, useDeleteSnapshot, useHistoryDates } from '../../lib/queries'
import type { HistorySnapshotSummary } from '../../types'
import { Button, Card, EmptyState, Skeleton } from '../../components/ui'
import { Dialog, DialogContent, DialogTrigger, DialogClose } from '../../components/overlay'

/** 历史快照：按日期分组的时间线 */
export function ArchivePage() {
  const { data: dates, isLoading: datesLoading } = useHistoryDates()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const results = useQueries({
    queries: (dates ?? []).map((d) => ({
      queryKey: qk.historyDate(d),
      queryFn: async () => {
        const r = await API.getHistoryByDate(d) as { success: boolean; snapshots: HistorySnapshotSummary[] }
        if (!r.success) throw new Error('获取快照失败')
        return r.snapshots
      },
      staleTime: 60_000,
    })),
  })

  const loading = datesLoading || results.some((r) => r.isLoading)

  const grouped = useMemo(() => {
    const map = new Map<string, HistorySnapshotSummary[]>()
    for (const d of dates ?? []) {
      // useQueries 返回顺序与 dates 一致
    }
    ;(dates ?? []).forEach((d, i) => {
      const snaps = results[i]?.data
      if (snaps?.length) map.set(d, snaps)
    })
    return map
  }, [dates, results])

  if (loading) {
    return (
      <div className="max-w-3xl space-y-2 p-4 sm:p-6">
        <Skeleton className="h-16" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
    )
  }

  if (!dates || dates.length === 0) {
    return (
      <EmptyState
        icon={<Archive size={36} strokeWidth={1.5} />}
        title="暂无历史快照"
        description="应用运行期间每小时会自动保存热搜快照，保留 7 天"
      />
    )
  }

  return (
    <div className="fade-in mx-auto max-w-3xl p-4 sm:p-6">
      {Array.from(grouped.entries()).map(([date, snaps]) => (
        <section key={date}>
          <h2 className="sticky top-0 z-10 -mx-1 bg-canvas/90 px-1 py-2.5 text-[13px] font-bold tracking-wide text-mute backdrop-blur-sm">
            {date}
            <span className="ml-2 font-normal text-ash">{snaps.length} 个快照</span>
          </h2>
          <Card className="mb-5 overflow-hidden">
            {snaps.map((s, i) => (
              <SnapshotRow
                key={s.id}
                snap={s}
                last={i === snaps.length - 1}
                onOpen={() => navigate(`/archive/${s.id}${searchParams.get('q') ? `?q=${encodeURIComponent(searchParams.get('q')!)}` : ''}`)}
              />
            ))}
          </Card>
        </section>
      ))}
    </div>
  )
}

function SnapshotRow({ snap, last, onOpen }: { snap: HistorySnapshotSummary; last: boolean; onOpen: () => void }) {
  const del = useDeleteSnapshot()
  return (
    <div
      className={`group flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2 ${last ? '' : 'border-b border-hair-soft'}`}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
    >
      <span className="tnum w-16 flex-shrink-0 text-[14px] font-bold text-ink">{snap.time.slice(0, 5)}</span>
      <span className="tnum flex-shrink-0 text-xs text-mute">
        {snap.total_count} 条{snap.filtered_count > 0 && snap.filtered_count !== snap.total_count ? ` · ${snap.filtered_count} 匹配` : ''}
      </span>
      {snap.keywords?.length > 0 && (
        <span className="hidden min-w-0 flex-1 gap-1.5 sm:flex">
          {snap.keywords.slice(0, 3).map((k) => (
            <span key={k} className="truncate rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-body">
              {k}
            </span>
          ))}
          {snap.keywords.length > 3 && (
            <span className="text-[11px] text-ash">+{snap.keywords.length - 3}</span>
          )}
        </span>
      )}
      <span className="flex-1" />
      {/* 删除（阻止冒泡） */}
      <Dialog>
        <DialogTrigger asChild>
          <button
            aria-label={`删除 ${snap.date} ${snap.time} 快照`}
            onClick={(e) => e.stopPropagation()}
            className="text-ash opacity-0 transition-opacity hover:text-down group-hover:opacity-100"
          >
            {del.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          </button>
        </DialogTrigger>
        <DialogContent
          title="删除这个快照？"
          description={`${snap.date} ${snap.time} · ${snap.total_count} 条热搜，删除后不可恢复`}
        >
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button>取消</Button>
            </DialogClose>
            <DialogClose asChild>
              <Button variant="danger" onClick={() => del.mutate(snap.id)}>确认删除</Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
      <ChevronRight size={15} className="flex-shrink-0 text-ash" />
    </div>
  )
}
