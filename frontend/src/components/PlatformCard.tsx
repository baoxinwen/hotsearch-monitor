import React, { useState, useMemo } from 'react'
import { RefreshCw } from 'lucide-react'
import type { HotSearchItem } from '../types'
import { PLATFORM_CONFIG, formatScore } from '../constants'

interface Props { platform: string; items: HotSearchItem[]; loading?: boolean; onRefresh?: (p: string) => void; searchQuery?: string }
const LIMIT = 30

function hl(text: string, re: RegExp | null, kws: string[]) {
  if (!re || !kws.length) return text
  return text.split(re).map((p, i) => kws.some(k => p.toLowerCase() === k.toLowerCase()) ? <mark key={i}>{p}</mark> : p)
}

export function PlatformCard({ platform, items, loading, onRefresh, searchQuery }: Props) {
  const [expanded, setExpanded] = useState(false)
  const cfg = PLATFORM_CONFIG[platform] || { name: platform, icon: '📌', color: '#6b7280', category: '' }
  const { re, kws } = useMemo(() => {
    if (!searchQuery?.trim()) return { re: null, kws: [] }
    const k = searchQuery.split(/[,，\s]+/).filter(Boolean)
    if (!k.length) return { re: null, kws: [] }
    return { re: new RegExp(`(${k.map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi'), kws: k }
  }, [searchQuery])

  const vis = expanded ? items : items.slice(0, LIMIT)
  const more = items.length > LIMIT

  return (
    <div className="platform-card">
      {/* 头部 — 带平台色装饰条 */}
      <div className="platform-card-header" style={{ borderLeft: `3px solid ${cfg.color || 'var(--c-hair)'}` }}>
        <div className="flex items-center gap-2">
          <span className="text-base">{cfg.icon}</span>
          <span style={{ fontWeight: 600 }}>{cfg.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="v-pill tnum">{items.length}</span>
          {onRefresh && (
            <button onClick={() => onRefresh(platform)} disabled={loading} className="p-1 rounded-p-xs transition-colors disabled:opacity-40"
              style={{ color: 'var(--c-ash)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--c-ink)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--c-ash)'} title="刷新">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          )}
        </div>
      </div>

      {/* 列表 */}
      <div>
        {items.length === 0 ? (
          <div className="px-5 py-8 text-center t-body" style={{ color: 'var(--c-ash)' }}>暂无数据</div>
        ) : (
          <>
            {vis.map((item, idx) => (
              <div key={item.id || idx} className="px-5 py-2.5 flex items-start gap-3 transition-colors"
                style={{ borderBottom: idx < vis.length - 1 ? '1px solid var(--c-hair-soft)' : 'none' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--c-surface-soft)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <span className="flex-shrink-0 w-5 h-5 rounded-p-xs flex items-center justify-center"
                  style={{
                    fontSize: '10px', fontWeight: item.rank <= 3 ? 700 : 500,
                    background: item.rank <= 3 ? 'var(--c-primary)' : 'var(--c-surface-soft)',
                    color: item.rank <= 3 ? '#23251d' : 'var(--c-mute)',
                  }}>{item.rank}</span>
                <div className="flex-1 min-w-0">
                  <a href={item.url} target="_blank" rel="noopener noreferrer"
                    className="line-clamp-2 transition-colors"
                    style={{ fontSize: '14px', fontWeight: 400, color: 'var(--c-ink)', lineHeight: 1.5 }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--c-primary)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--c-ink)'}>
                    {hl(item.title, re, kws)}
                  </a>
                </div>
                {(item.score > 0 || item.hot_display) && (
                  <span className="flex-shrink-0 tnum t-caption">{item.score > 0 ? formatScore(item.score) : item.hot_display}</span>
                )}
              </div>
            ))}
            {more && !expanded && (
              <button onClick={() => setExpanded(true)} className="w-full px-5 py-2.5 transition-colors"
                style={{ fontSize: '12px', fontWeight: 600, color: 'var(--c-primary)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--c-surface-soft)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                展开剩余 {items.length - LIMIT} 条
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
