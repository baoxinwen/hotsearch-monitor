import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ReferenceLine, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts'
import { RefreshCw } from 'lucide-react'
import { useOverview, usePlatforms, qk } from '../../lib/queries'
import { useUIStore } from '../../lib/store'
import { formatScore } from '../../lib/format'
import { platformName, safeExternalUrl } from '../../lib/live'
import { Button, Card, EmptyState, Skeleton } from '../../components/ui'

const CHART_COLORS = [
  '#f7a501', '#e07830', '#cd4239', '#d4563a', '#c26e3a', '#b17816',
  '#6b8e23', '#3a7d44', '#1078a3', '#2c84e0', '#8b6914', '#a0522d',
]

function ChartTooltipStyle() {
  return {
    contentStyle: {
      background: 'var(--c-surface)',
      border: '1px solid var(--c-hair)',
      borderRadius: 9,
      boxShadow: 'var(--shadow-pop)',
      fontSize: 12.5,
      color: 'var(--c-ink)',
    },
    cursorStyle: { fill: 'var(--c-surface-2)' },
    labelStyle: { color: 'var(--c-ink)', fontWeight: 600 },
    itemStyle: { color: 'var(--c-body)' },
  }
}

export function InsightsPage() {
  const platformFilter = useUIStore((s) => s.platformFilter)
  const platformsParam = platformFilter.length > 0 ? platformFilter.join(',') : undefined
  const { data, isLoading, isError, error, refetch, isFetching } = useOverview(platformsParam)
  const { data: platforms } = usePlatforms()
  const navigate = useNavigate()
  const qc = useQueryClient()

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 items-start gap-4 p-4 sm:p-6 xl:grid-cols-2">
        <Skeleton className="h-[420px]" /><Skeleton className="h-[420px]" />
        <Skeleton className="h-[300px]" /><Skeleton className="h-[300px]" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <EmptyState
        title="暂无分析数据"
        description={(error as Error)?.message ?? '请先获取热搜数据'}
        action={
          <Button variant="primary" onClick={() => void refetch()}>
            <RefreshCw size={14} /> 重新加载
          </Button>
        }
      />
    )
  }

  const d = data.data
  const goFilter = (term: string) => navigate(`/?q=${encodeURIComponent(term)}`)
  const nameOf = (p: string) => platformName(p, platforms?.platforms)

  return (
    <div className="fade-in p-4 sm:p-6">
      {/* 信息行 */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="text-[13px] text-mute">
          分析 <b className="tnum text-ink">{data.total_items.toLocaleString()}</b> 条热搜 · 来自{' '}
          <b className="tnum text-ink">{data.platforms_analyzed}</b> 个平台 · 点击图表中的关键词可跳转筛选
        </span>
        <div className="flex-1" />
        <Button
          onClick={() => {
            void qc.invalidateQueries({ queryKey: qk.overview(platformsParam) })
            void refetch()
          }}
          disabled={isFetching}
        >
          <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
          重新分析
        </Button>
      </div>

      {/* items-start 防止同行卡片被拉伸 */}
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
        {/* 1. 高频关键词 */}
        <Card className="p-4">
          <h3 className="t-label mb-3">高频关键词 Top 20</h3>
          <ResponsiveContainer width="100%" height={440}>
            <BarChart
              data={d.keywords.map((k) => ({ name: k.term, count: k.count }))}
              layout="vertical"
              margin={{ left: 8, right: 16, top: 0, bottom: 0 }}
            >
              <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--c-mute)' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={96} interval={0} tick={{ fontSize: 12, fill: 'var(--c-body)' }} axisLine={false} tickLine={false} />
              <Tooltip {...ChartTooltipStyle()} />
              <Bar dataKey="count" name="出现次数" fill="var(--c-accent)" radius={[0, 4, 4, 0]} cursor="pointer" onClick={(x: any) => x?.name && goFilter(x.name)} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* 2. 平台分布（环图 + 图例列表） */}
        <Card className="p-4">
          <h3 className="t-label mb-3">平台热搜分布</h3>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <Donut data={d.platform_distribution.slice(0, 12).map((p) => ({ name: nameOf(p.platform), value: p.count }))} />
            <ul className="min-w-[150px] flex-1 space-y-1.5">
              {d.platform_distribution.slice(0, 10).map((p, i) => {
                const total = d.platform_distribution.reduce((s, x) => s + x.count, 0)
                return (
                  <li key={p.platform} className="flex items-center gap-2 text-[12.5px]">
                    <span className="h-2.5 w-2.5 flex-shrink-0 rounded-xs" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="flex-1 truncate text-body">{nameOf(p.platform)}</span>
                    <span className="tnum text-mute">{p.count} 条 · {total ? ((p.count / total) * 100).toFixed(1) : 0}%</span>
                  </li>
                )
              })}
            </ul>
          </div>
        </Card>

        {/* 3. 分类热度 */}
        <Card className="p-4">
          <h3 className="t-label mb-3">分类热度对比</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={d.category_heat.map((c) => ({ name: c.category, count: c.count, avg: Math.round(c.avg_score) }))} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--c-hair-soft)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--c-mute)' }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="l" tick={{ fontSize: 11, fill: 'var(--c-mute)' }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11, fill: 'var(--c-mute)' }} axisLine={false} tickLine={false} />
              <Tooltip {...ChartTooltipStyle()} />
              <Bar yAxisId="l" dataKey="count" name="条目数" fill="var(--c-accent)" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="r" dataKey="avg" name="平均热度" fill="var(--c-hair)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* 4. 全站 Top 10 */}
        <Card className="p-4">
          <h3 className="t-label mb-3">全站热度 Top 10</h3>
          <div className="space-y-0.5">
            {d.top_items.map((item) => (
              <div key={`${item.platform}-${item.rank}`} className="flex items-center gap-3 rounded-sm px-2 py-1.5 hover:bg-surface-2">
                <span className={`tnum flex h-[20px] w-[22px] flex-shrink-0 items-center justify-center rounded-xs text-[11px] ${item.rank <= 3 ? 'bg-accent font-bold text-on-accent' : 'font-semibold text-mute'}`}>
                  {item.rank}
                </span>
                <a href={safeExternalUrl(item.url) || undefined} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-[13px] text-ink hover:text-link">
                  {item.title}
                </a>
                <span className="tnum flex-shrink-0 text-xs text-mute">{item.score > 0 ? formatScore(item.score) : item.hot_display}</span>
                <span className="w-16 flex-shrink-0 truncate text-right text-xs text-ash">{nameOf(item.platform)}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* 5. 热度分布 */}
        <Card className="p-4">
          <h3 className="t-label mb-3">热度分布</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={d.heat_distribution} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--c-hair-soft)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10.5, fill: 'var(--c-mute)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--c-mute)' }} axisLine={false} tickLine={false} />
              <Tooltip {...ChartTooltipStyle()} />
              <ReferenceLine
                y={d.heat_distribution.reduce((s, x) => s + x.count, 0) / (d.heat_distribution.length || 1)}
                stroke="var(--c-link)"
                strokeDasharray="4 4"
                label={{ value: '平均', fill: 'var(--c-link)', fontSize: 11, position: 'right' }}
              />
              <Bar dataKey="count" name="条目数" radius={[4, 4, 0, 0]}>
                {d.heat_distribution.map((_, i) => (
                  <Cell key={i} fill={i === d.heat_distribution.length - 1 ? 'var(--c-hair)' : 'var(--c-accent)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* 6. 跨平台热搜 */}
        <Card className="p-4">
          <h3 className="t-label mb-1">跨平台热搜</h3>
          <p className="mb-3 text-xs text-ash">同一话题出现在多个平台，点击跳转筛选</p>
          {d.cross_platform.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-mute">暂无跨平台重合数据</p>
          ) : (
            <div className="space-y-0.5">
              {d.cross_platform.map((item, i) => (
                <button key={i} onClick={() => goFilter(item.title)} className="flex w-full items-center gap-3 rounded-sm px-2 py-1.5 text-left hover:bg-surface-2">
                  <span className="flex-shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-ink">
                    {item.platform_count} 平台
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-body">{item.title}</span>
                  <span className="tnum flex-shrink-0 text-xs text-mute">{formatScore(item.score)}</span>
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* 7. 关键词趋势（需要配置关键词且有多个快照） */}
        <Card className="p-4 xl:col-span-2">
          <KeywordTrendCard counts={d.keyword_trend} />
        </Card>
      </div>
    </div>
  )
}

function KeywordTrendCard({ counts }: { counts: import('../../types').KeywordTrendPoint[] }) {
  const series = useMemo(() => counts.map((t) => ({ time: t.time.split(' ')[1] ?? t.time, ...t.counts })), [counts])
  const keywords = Object.keys(counts[0]?.counts ?? {})

  if (counts.length < 2) {
    return (
      <>
        <h3 className="t-label mb-1">关键词趋势</h3>
        <p className="mb-3 text-xs text-ash">需要今日至少 2 个历史快照，且已在设置中配置监控关键词</p>
        <EmptyState
          title="暂无趋势数据"
          description={counts.length === 1 ? '今天已有 1 个快照，等下一轮快照生成后即可查看趋势' : '尚未生成今日快照'}
        />
      </>
    )
  }

  return (
    <>
      <h3 className="t-label mb-1">关键词趋势（今日）</h3>
      <p className="mb-3 text-xs text-ash">按快照时间统计监控关键词的命中条数</p>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={series} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--c-hair-soft)" vertical={false} />
          <XAxis dataKey="time" tick={{ fontSize: 11, fill: 'var(--c-mute)' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--c-mute)' }} axisLine={false} tickLine={false} />
          <Tooltip {...ChartTooltipStyle()} />
          {keywords.map((kw, i) => (
            <Line key={kw} type="monotone" dataKey={kw} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </>
  )
}

/** 纯 SVG 环图（带中心汇总与悬停位移） */
function Donut({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const size = 220, cx = 110, cy = 110, outerR = 92, innerR = 46
  const [hover, setHover] = useState(-1)

  const sectors = useMemo(() => {
    let acc = 0
    return data.map((d, i) => {
      const start = acc
      const sweep = total > 0 ? (d.value / total) * 360 : 0
      acc += sweep
      return { ...d, start, sweep, color: CHART_COLORS[i % CHART_COLORS.length] }
    })
  }, [data, total])

  const arc = (startDeg: number, sweepDeg: number, r1: number, r2: number) => {
    if (sweepDeg <= 0) return ''
    const rad = (d: number) => ((d - 90) * Math.PI) / 180
    const end = startDeg + sweepDeg
    const large = sweepDeg > 180 ? 1 : 0
    const a1 = rad(startDeg), a2 = rad(end)
    return [
      `M ${cx + r2 * Math.cos(a1)} ${cy + r2 * Math.sin(a1)}`,
      `A ${r2} ${r2} 0 ${large} 1 ${cx + r2 * Math.cos(a2)} ${cy + r2 * Math.sin(a2)}`,
      `L ${cx + r1 * Math.cos(a2)} ${cy + r1 * Math.sin(a2)}`,
      `A ${r1} ${r1} 0 ${large} 0 ${cx + r1 * Math.cos(a1)} ${cy + r1 * Math.sin(a1)}`,
      'Z',
    ].join(' ')
  }

  const hovered = hover >= 0 ? sectors[hover] : null

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        {sectors.map((s, i) => {
          const mid = s.start + s.sweep / 2
          const dx = hover === i ? Math.cos(((mid - 90) * Math.PI) / 180) * 5 : 0
          const dy = hover === i ? Math.sin(((mid - 90) * Math.PI) / 180) * 5 : 0
          return (
            <path
              key={i}
              d={arc(s.start, s.sweep, innerR, outerR)}
              fill={s.color}
              stroke="var(--c-surface)"
              strokeWidth={2}
              style={{ transform: `translate(${dx}px, ${dy}px)`, transition: 'transform 0.15s ease', cursor: 'pointer' }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(-1)}
            />
          )
        })}
        <text x={cx} y={hovered ? cy - 6 : cy - 4} textAnchor="middle" style={{ fontSize: 13, fontWeight: 650, fill: 'var(--c-ink)' }}>
          {hovered ? hovered.name : '总计'}
        </text>
        <text x={cx} y={hovered ? cy + 12 : cy + 14} textAnchor="middle" style={{ fontSize: 11.5, fill: 'var(--c-mute)' }}>
          {hovered ? `${((hovered.value / total) * 100).toFixed(1)}%` : total.toLocaleString()}
        </text>
      </svg>
    </div>
  )
}
