import React, { useMemo } from 'react'
import type { HotSearchItem } from '../types'
import { PLATFORM_CONFIG, PLATFORM_CATEGORIES } from '../constants'
import { PlatformCard } from './PlatformCard'

interface DashboardProps { data: Record<string, HotSearchItem[]>; loadingPlatforms: Record<string, boolean>; onRefreshPlatform: (p: string) => void; searchQuery?: string }

export function Dashboard({ data, loadingPlatforms, onRefreshPlatform, searchQuery }: DashboardProps) {
  const grouped = useMemo(() => {
    const r: Record<string, { platform: string; items: HotSearchItem[] }[]> = {}
    for (const [cat, ps] of Object.entries(PLATFORM_CATEGORIES)) {
      const items = ps.filter(p => data[p]?.length > 0).map(p => ({ platform: p, items: data[p] || [] }))
      if (items.length > 0) r[cat] = items
    }
    return r
  }, [data])

  const filtered = useMemo(() => {
    if (!searchQuery?.trim()) return grouped
    const kws = searchQuery.split(/[,，\s]+/).filter(Boolean).map(k => k.toLowerCase())
    if (!kws.length) return grouped
    const r: typeof grouped = {}
    for (const [cat, ps] of Object.entries(grouped)) {
      const f = ps.map(({ platform, items }) => ({ platform, items: items.filter(i => kws.some(k => i.title.toLowerCase().includes(k))) })).filter(p => p.items.length > 0)
      if (f.length > 0) r[cat] = f
    }
    return r
  }, [grouped, searchQuery])

  const stats = useMemo(() => {
    const ps = Object.values(filtered).flat()
    return {
      total: ps.reduce((s, { items }) => s + items.length, 0),
      active: ps.length,
      sources: Object.keys(data).length,
      cats: Object.keys(filtered).length,
    }
  }, [filtered, data])

  return (
    <div className="animate-fade-in-up">
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard label="总条目" value={stats.total} icon="📊" />
        <StatCard label="活跃平台" value={stats.active} icon="🌐" />
        <StatCard label="数据源" value={stats.sources} icon="📡" />
        <StatCard label="分类" value={stats.cats} icon="📁" />
      </div>

      {/* 平台卡片分类 */}
      {Object.entries(filtered).map(([cat, ps], idx) => (
        <div key={cat} className={idx > 0 ? 'pt-8' : ''}>
          {idx > 0 && <div className="section-divider mb-6" />}
          <h2 className="t-subheading mb-4 px-1">{cat}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {ps.map(({ platform, items }) => (
              <PlatformCard key={platform} platform={platform} items={items} loading={loadingPlatforms[platform]} onRefresh={onRefreshPlatform} searchQuery={searchQuery} />
            ))}
          </div>
        </div>
      ))}

      {Object.keys(filtered).length === 0 && (
        <div className="text-center py-20">
          <div className="text-4xl mb-3 opacity-30">📭</div>
          <p className="t-body" style={{ color: 'var(--c-ash)' }}>暂无数据，请稍后刷新或检查网络连接</p>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="stat-card">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base opacity-60">{icon}</span>
      </div>
      <div className="tnum t-stat">{value.toLocaleString()}</div>
      <div className="t-stat-label mt-1.5">{label}</div>
    </div>
  )
}
