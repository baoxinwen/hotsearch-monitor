import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  Legend, LineChart, Line, CartesianGrid, Brush, ReferenceLine,
} from 'recharts'
import { TrendKeyword } from '../types'
import { API } from '../api/client'
import { PLATFORM_CONFIG, formatScore } from '../constants'

interface AnalysisViewProps { onTermClick?: (term: string) => void; isDark?: boolean; selectedPlatforms?: string[] }

const CHART_COLORS = [
  '#f7a501', '#e07830', '#cd4239', '#d4563a', '#c26e3a', '#b17816',
  '#2c84e0', '#1078a3', '#3a7d44', '#6b8e23', '#8b6914', '#a0522d',
]

interface OverviewData {
  keywords: TrendKeyword[]
  platform_distribution: { platform: string; count: number; avg_score: number }[]
  category_heat: { category: string; count: number; total_score: number; avg_score: number; platform_count: number }[]
  top_items: { rank: number; title: string; score: number; hot_display: string; platform: string; url: string }[]
  heat_distribution: { label: string; count: number }[]
  cross_platform: { title: string; platform_count: number; platforms: string[]; score: number }[]
  keyword_trend: { time: string; timestamp: number; counts: Record<string, number>; total_items: number }[]
}

// Unified tooltip
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-hair)', borderRadius: 8, boxShadow: '0 2px 8px rgba(35,37,29,0.1)', padding: '8px 12px' }}>
      {label && <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--c-ink)', marginBottom: 4 }}>{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ fontSize: '12px', color: p.color || 'var(--c-primary)', fontWeight: 500 }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  )
}

// Custom SVG Donut Chart — pure SVG, no focus outline issues
function DonutChart({ data }: { data: { name: string; value: number }[] }) {
  const [hovered, setHovered] = useState(-1)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const total = data.reduce((s, d) => s + d.value, 0)
  const size = 300, cx = 150, cy = 150, outerR = 110, innerR = 50

  const sectors = useMemo(() => {
    let acc = 0
    return data.map((d, i) => {
      const startAngle = acc
      const sweep = total > 0 ? (d.value / total) * 360 : 0
      acc += sweep
      return { ...d, startAngle, sweep, color: CHART_COLORS[i % CHART_COLORS.length] }
    })
  }, [data, total])

  // Build SVG arc path for a donut sector
  const sectorPath = (startDeg: number, sweepDeg: number) => {
    if (sweepDeg <= 0) return ''
    const toRad = (d: number) => (d - 90) * Math.PI / 180
    const endDeg = startDeg + sweepDeg
    const largeArc = sweepDeg > 180 ? 1 : 0
    const os = toRad(startDeg), oe = toRad(endDeg)
    return [
      `M ${cx + outerR * Math.cos(os)} ${cy + outerR * Math.sin(os)}`,
      `A ${outerR} ${outerR} 0 ${largeArc} 1 ${cx + outerR * Math.cos(oe)} ${cy + outerR * Math.sin(oe)}`,
      `L ${cx + innerR * Math.cos(oe)} ${cy + innerR * Math.sin(oe)}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${cx + innerR * Math.cos(os)} ${cy + innerR * Math.sin(os)}`,
      'Z',
    ].join(' ')
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  const hoveredItem = hovered >= 0 ? sectors[hovered] : null

  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ outline: 'none' }} onMouseMove={handleMouseMove}>
        {sectors.map((s, i) => {
          // Hover: scale from center via transform (no path recalculation)
          const midAngle = s.startAngle + s.sweep / 2
          const tx = Math.cos((midAngle - 90) * Math.PI / 180) * 6
          const ty = Math.sin((midAngle - 90) * Math.PI / 180) * 6
          return (
            <path key={i} d={sectorPath(s.startAngle, s.sweep)}
              fill={s.color} stroke="var(--c-surface)" strokeWidth={2}
              style={{
                cursor: 'pointer', outline: 'none',
                transform: hovered === i ? `translate(${tx}px, ${ty}px)` : 'translate(0,0)',
                transition: 'transform 0.15s ease',
              }}
              onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(-1)} />
          )
        })}
        {hoveredItem ? (
          <>
            <text x={cx} y={cy - 8} textAnchor="middle" style={{ fontSize: 14, fontWeight: 600, fill: 'var(--c-ink)' }}>{hoveredItem.name}</text>
            <text x={cx} y={cy + 12} textAnchor="middle" style={{ fontSize: 12, fill: 'var(--c-ash)' }}>{((hoveredItem.value / total) * 100).toFixed(1)}%</text>
          </>
        ) : (
          <>
            <text x={cx} y={cy - 4} textAnchor="middle" style={{ fontSize: 13, fontWeight: 600, fill: 'var(--c-ink)' }}>总计</text>
            <text x={cx} y={cy + 14} textAnchor="middle" style={{ fontSize: 12, fill: 'var(--c-ash)' }}>{total.toLocaleString()}</text>
          </>
        )}
      </svg>
      {hoveredItem && (
        <div style={{ position: 'absolute', left: tooltipPos.x + 12, top: tooltipPos.y - 10, pointerEvents: 'none',
          background: 'var(--c-surface)', border: '1px solid var(--c-hair)', borderRadius: 8,
          boxShadow: '0 2px 8px rgba(35,37,29,0.1)', padding: '6px 10px', whiteSpace: 'nowrap', zIndex: 10 }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--c-ink)' }}>{hoveredItem.name}</p>
          <p style={{ fontSize: '12px', color: 'var(--c-primary)' }}>{hoveredItem.value.toLocaleString()} 条</p>
        </div>
      )}
    </div>
  )
}

export function AnalysisView({ onTermClick, isDark, selectedPlatforms }: AnalysisViewProps) {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalItems, setTotalItems] = useState(0)
  const [platformsAnalyzed, setPlatformsAnalyzed] = useState(0)
  const platformsParam = selectedPlatforms && selectedPlatforms.length > 0 ? selectedPlatforms.join(',') : undefined

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const resp = await API.getAnalysisOverview(platformsParam) as any
      if (resp.success) { setData(resp.data); setTotalItems(resp.total_items || 0); setPlatformsAnalyzed(resp.platforms_analyzed || 0) }
      else setError(resp.message || '获取分析数据失败')
    } catch (e: any) { setError(e?.message || '网络请求失败') } finally { setLoading(false) }
  }, [platformsParam])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading && !data) return <div className="text-center py-20"><p className="t-body" style={{ color: 'var(--c-ash)' }}>正在分析热搜数据...</p></div>
  if (!data) return (
    <div className="text-center py-20">
      <p className="t-body" style={{ color: 'var(--c-ash)' }}>{error || '暂无数据，请先获取热搜'}</p>
      <button onClick={fetchData} className="v-btn-primary mt-4">重新加载</button>
    </div>
  )

  const avgHeat = data.heat_distribution.length > 0
    ? Math.round(data.heat_distribution.reduce((s, d) => s + d.count, 0) / data.heat_distribution.length)
    : 0

  return (
    <div className="animate-fade-in-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="t-heading">趋势分析</h2>
          <p className="t-caption mt-1">分析 {totalItems} 条热搜，来自 {platformsAnalyzed} 个平台</p>
        </div>
        <button onClick={fetchData} disabled={loading} className="v-btn-primary">{loading ? '分析中...' : '重新分析'}</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 1. Keywords — clickable bars */}
        <div className="card p-5">
          <h3 className="t-label mb-3">高频关键词 Top 20</h3>
          <ResponsiveContainer width="100%" height={500}>
            <BarChart data={data.keywords.map((kw, i) => ({ name: kw.term, count: kw.count }))}
              layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}
              style={{ cursor: 'pointer', outline: 'none' }}>
              <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--c-ash)' }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: 'var(--c-ink)' }} width={100} interval={0} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="count" name="出现次数" radius={[0, 4, 4, 0]} cursor="pointer"
                animationDuration={800} animationEasing="ease-out"
                onClick={(d: any) => onTermClick?.(d.name)}
                focusable={false}>
                {data.keywords.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="t-caption mt-2 text-center">点击关键词跳转到筛选</p>
        </div>

        {/* 2. Platform donut — custom SVG (no Recharts focus issues) */}
        <div className="card p-5">
          <h3 className="t-label mb-3">平台热搜分布</h3>
          <DonutChart data={data.platform_distribution.slice(0, 12).map((p, i) => ({
            name: PLATFORM_CONFIG[p.platform]?.name || p.platform, value: p.count,
          }))} />
        </div>

        {/* 3. Category heat — dual Y-axis for different scales */}
        <div className="card p-5">
          <h3 className="t-label mb-3">分类热度对比</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.category_heat.map(c => ({
              name: c.category, count: c.count, avg_score: c.avg_score,
            }))} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--c-hair-soft)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--c-ash)' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'var(--c-ash)' }} label={{ value: '条目数', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: 'var(--c-ash)' } }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'var(--c-ash)' }} label={{ value: '平均热度', angle: 90, position: 'insideRight', style: { fontSize: 11, fill: 'var(--c-ash)' } }} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: 'var(--c-mute)' }} />
              <Bar yAxisId="left" dataKey="count" name="条目数" fill="#f7a501" radius={[4, 4, 0, 0]} animationDuration={800} cursor="pointer" />
              <Bar yAxisId="right" dataKey="avg_score" name="平均热度" fill="#e07830" radius={[4, 4, 0, 0]} animationDuration={800} cursor="pointer" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 4. Top 10 — clickable links */}
        <div className="card p-5">
          <h3 className="t-label mb-3">全站热度 Top 10</h3>
          <div className="space-y-2">
            {data.top_items.map((item) => (
              <div key={item.rank} className="flex items-center gap-3 py-1 px-2 rounded-p-sm transition-colors"
                onMouseEnter={e => e.currentTarget.style.background = 'var(--c-surface-soft)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <span className="flex-shrink-0 w-5 h-5 rounded-p-xs flex items-center justify-center text-xs font-medium"
                  style={{ background: item.rank <= 3 ? 'var(--c-primary)' : 'var(--c-surface-soft)', color: item.rank <= 3 ? '#23251d' : 'var(--c-mute)', fontWeight: item.rank <= 3 ? 700 : 500 }}>
                  {item.rank}
                </span>
                <a href={item.url} target="_blank" rel="noopener noreferrer"
                  className="flex-1 text-sm truncate transition-colors"
                  style={{ color: 'var(--c-ink)' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--c-primary)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--c-ink)'}>
                  {item.title}
                </a>
                <span className="flex-shrink-0 tnum t-caption">{item.score > 0 ? formatScore(item.score) : item.hot_display}</span>
                <span className="flex-shrink-0 tnum t-caption w-16 text-right">{PLATFORM_CONFIG[item.platform]?.name || item.platform}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 5. Heat distribution — with reference line */}
        <div className="card p-5">
          <h3 className="t-label mb-3">热度分布</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.heat_distribution} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--c-hair-soft)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--c-ash)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--c-ash)' }} />
              <Tooltip content={<ChartTooltip />} />
              {avgHeat > 0 && <ReferenceLine y={avgHeat} stroke="var(--c-primary)" strokeDasharray="4 4" label={{ value: '平均', fill: 'var(--c-primary)', fontSize: 11 }} />}
              <Bar dataKey="count" name="条目数" radius={[4, 4, 0, 0]} animationDuration={800} cursor="pointer">
                {data.heat_distribution.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 6. Cross-platform — clickable items */}
        <div className="card p-5">
          <h3 className="t-label mb-3">跨平台热搜 <span className="t-caption font-normal">（同一话题出现在多个平台）</span></h3>
          {data.cross_platform.length === 0 ? (
            <p className="t-body text-center py-8" style={{ color: 'var(--c-ash)' }}>暂无跨平台重合数据</p>
          ) : (
            <div className="space-y-1">
              {data.cross_platform.map((item, i) => (
                <div key={i} className="flex items-center gap-3 py-1.5 px-2 rounded-p-sm transition-colors cursor-pointer"
                  onClick={() => onTermClick?.(item.title)}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--c-surface-soft)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <span className="v-pill flex-shrink-0">{item.platform_count} 平台</span>
                  <span className="flex-1 text-sm truncate" style={{ color: 'var(--c-ink)' }}>{item.title}</span>
                  <span className="flex-shrink-0 tnum t-caption">{formatScore(item.score)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 7. Keyword trend — with brush and active dots */}
        {data.keyword_trend && data.keyword_trend.length > 1 && (
          <div className="card p-5 lg:col-span-2">
            <h3 className="t-label mb-3">关键词趋势（今日）</h3>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={data.keyword_trend.map(t => ({
                time: t.time.split(' ')[1] || t.time, ...t.counts,
              }))} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--c-hair-soft)" />
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: 'var(--c-ash)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--c-ash)' }} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: 'var(--c-mute)' }} />
                {Object.keys(data.keyword_trend[0]?.counts || {}).map((kw, i) => (
                  <Line key={kw} type="monotone" dataKey={kw} stroke={CHART_COLORS[i % CHART_COLORS.length]}
                    strokeWidth={2} dot={{ r: 3, fill: CHART_COLORS[i % CHART_COLORS.length] }}
                    activeDot={{ r: 6, strokeWidth: 2, fill: '#fff', stroke: CHART_COLORS[i % CHART_COLORS.length] }}
                    animationDuration={800} />
                ))}
                {data.keyword_trend.length > 5 && <Brush dataKey="time" height={30} stroke="var(--c-hair)" fill="var(--c-surface)" />}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
