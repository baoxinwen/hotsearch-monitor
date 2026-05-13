import React, { useState, useEffect } from 'react'
import { Calendar, ChevronRight, Download, Loader2 } from 'lucide-react'
import type { HistorySnapshot } from '../types'
import { API } from '../api/client'
import { PLATFORM_CONFIG, formatScore } from '../constants'

interface SnapshotSummary {
  id: string; timestamp: number; date: string; time: string
  total_count: number; filtered_count: number; keywords: string[]
}

export function HistoryView() {
  const [dates, setDates] = useState<string[]>([])
  const [sel, setSel] = useState('')
  const [snaps, setSnaps] = useState<SnapshotSummary[]>([])
  const [active, setActive] = useState<HistorySnapshot | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState('')

  useEffect(() => { API.getHistoryDates().then((r: any) => { if (r.success) setDates(r.dates || []) }).catch(() => {}) }, [])

  const load = async (d: string) => {
    setSel(d); setLoading(true); setActive(null)
    try { const r = await API.getHistoryByDate(d) as any; if (r.success) setSnaps(r.snapshots || []) } finally { setLoading(false) }
  }

  const loadDetail = async (snap: SnapshotSummary) => {
    setLoadingDetail(snap.id)
    try {
      const r = await API.getSnapshotDetail(snap.id) as any
      if (r.success && r.snapshot) setActive(r.snapshot)
    } finally { setLoadingDetail('') }
  }

  const csv = (s: HistorySnapshot) => {
    const e = (x: string) => `"${(x||'').replace(/"/g,'""').replace(/[\r\n]+/g,' ')}"`
    let c = '﻿平台,排名,标题,热度,链接\n'
    for (const [p, items] of Object.entries(s.data)) { const n = PLATFORM_CONFIG[p]?.name||p; for (const i of items) c += `${e(n)},${i.rank},${e(i.title)},${i.score},${e(i.url)}\n` }
    const b = new Blob([c], {type:'text/csv;charset=utf-8'}); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href=u; a.download=`hotsearch_${s.date}_${s.time}.csv`; a.click(); URL.revokeObjectURL(u)
  }

  if (active) return (
    <div>
      <button onClick={() => setActive(null)} className="mb-6 transition-colors" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--c-primary)' }}>← 返回快照列表</button>
      <div className="flex items-center justify-between mb-6">
        <div><h2 className="t-heading">{active.date} {active.time}</h2>
          <p className="tnum t-caption mt-1">共 {active.total_count} 条热搜，{active.filtered_count} 条匹配</p></div>
        <button onClick={() => csv(active)} className="v-btn-secondary flex items-center gap-1.5"><Download size={14} /> 导出 CSV</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Object.entries(active.data).map(([p, items]) => (
          <div key={p} className="platform-card">
            <div className="platform-card-header"><div className="flex items-center gap-2"><span>{PLATFORM_CONFIG[p]?.icon}</span><span>{PLATFORM_CONFIG[p]?.name||p}</span></div><span className="v-pill tnum">{items.length}</span></div>
            <div>{items.slice(0, 20).map((item, i) => (
              <div key={i} className="px-5 py-2.5 flex items-center gap-2 transition-colors" style={{ borderBottom: i < Math.min(items.length,20)-1 ? '1px solid var(--c-surface-soft)' : 'none' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--c-surface-soft)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <span className="w-5 h-5 rounded-p-xs flex items-center justify-center"
                  style={{ fontSize: '10px', background: item.rank<=3?'var(--c-primary)':'var(--c-surface-soft)', color: item.rank<=3?'#23251d':'var(--c-mute)', fontWeight: item.rank<=3?700:500 }}>{item.rank}</span>
                <span className="flex-1 text-sm truncate" style={{ color: 'var(--c-ink)' }}>{item.title}</span>
                {item.score > 0 && <span className="tnum t-caption">{formatScore(item.score)}</span>}
              </div>))}</div>
          </div>))}
      </div>
    </div>
  )

  return (
    <div className="animate-fade-in-up">
      <h2 className="t-heading mb-6">历史快照</h2>
      {dates.length === 0 ? <div className="text-center py-20"><p className="t-body" style={{ color: 'var(--c-ash)' }}>暂无历史快照</p></div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card p-5">
            <h3 className="t-subheading mb-3">选择日期</h3>
            <div className="space-y-0.5">{dates.map(d => (
              <button key={d} onClick={() => load(d)} className="w-full flex items-center justify-between px-3 py-2.5 rounded-p-sm transition-all"
                style={{ fontSize: '14px', fontWeight: sel===d?600:400, color: sel===d?'#23251d':'var(--c-body)', background: sel===d?'var(--c-primary)':'transparent' }}
                onMouseEnter={e => { if (sel!==d) e.currentTarget.style.background='var(--c-surface-soft)' }} onMouseLeave={e => { if (sel!==d) e.currentTarget.style.background='transparent' }}>
                <div className="flex items-center gap-2"><Calendar size={14} /><span className="tnum">{d}</span></div><ChevronRight size={14} />
              </button>))}</div>
          </div>
          <div className="card p-5">
            <h3 className="t-subheading mb-3">{sel?`${sel} 的快照`:'选择日期查看快照'}</h3>
            {loading ? <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="skeleton h-12" />)}</div>
            : snaps.length===0 ? <p className="t-body text-center py-8" style={{ color: 'var(--c-ash)' }}>{sel?'该日期无快照':'请先选择日期'}</p>
            : <div className="space-y-0.5">{snaps.map(s => (
                <button key={s.id} onClick={() => loadDetail(s)} disabled={loadingDetail === s.id}
                  className="w-full flex items-center justify-between px-3 py-3 rounded-p-sm transition-colors text-left disabled:opacity-50"
                  onMouseEnter={e => e.currentTarget.style.background='var(--c-surface-soft)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                  <div><div className="tnum" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--c-ink)' }}>{s.time}</div>
                    <div className="tnum t-caption">{s.total_count} 条 | {s.filtered_count} 匹配</div></div>
                  {loadingDetail === s.id ? <Loader2 size={14} className="animate-spin" style={{ color: 'var(--c-ash)' }} /> : <ChevronRight size={14} style={{ color: 'var(--c-ash)' }} />}
                </button>))}</div>}
          </div>
        </div>
      )}
    </div>
  )
}
