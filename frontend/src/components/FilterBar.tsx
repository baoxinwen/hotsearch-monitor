import React from 'react'
import { Search, X, ChevronDown, ChevronUp } from 'lucide-react'
import { PLATFORM_CATEGORIES, PLATFORM_CONFIG } from '../constants'

interface Props { selectedPlatforms: string[]; onPlatformsChange: (p: string[]) => void; searchQuery: string; onSearchChange: (q: string) => void }

export function FilterBar({ selectedPlatforms, onPlatformsChange, searchQuery, onSearchChange }: Props) {
  const [exp, setExp] = React.useState(false)
  const all = Object.values(PLATFORM_CATEGORIES).flat()
  const toggle = (p: string) => onPlatformsChange(selectedPlatforms.includes(p) ? selectedPlatforms.filter(x => x !== p) : [...selectedPlatforms, p])
  const toggleAll = () => onPlatformsChange(all.every(p => selectedPlatforms.includes(p)) ? [] : [...all])
  const toggleCat = (c: string) => { const cp = PLATFORM_CATEGORIES[c] || []; const allSel = cp.every(p => selectedPlatforms.includes(p)); onPlatformsChange(allSel ? selectedPlatforms.filter(p => !cp.includes(p)) : [...new Set([...selectedPlatforms, ...cp])]) }
  const allSel = all.length > 0 && all.every(p => selectedPlatforms.includes(p))

  return (
    <div className="card p-5 mb-6">
      <div className="relative mb-3">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--c-ash)' }} />
        <input type="text" value={searchQuery} onChange={e => onSearchChange(e.target.value)} placeholder="搜索热搜标题（多个关键词用逗号或空格分隔）..." className="v-input pl-9 pr-9" />
        {searchQuery && <button onClick={() => onSearchChange('')} className="absolute right-3 top-1/2 -translate-y-1/2"
          style={{ color: 'var(--c-ash)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--c-ink)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--c-ash)'}><X size={14} /></button>}
      </div>
      <div className="flex items-center gap-3">
        <button onClick={() => setExp(!exp)} className="flex items-center gap-1" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--c-primary)' }}>
          {exp ? <ChevronUp size={14} /> : <ChevronDown size={14} />}{exp ? '收起平台筛选' : '展开平台筛选'}
        </button>
        <span className="tnum t-caption">{selectedPlatforms.length > 0 ? `${selectedPlatforms.length}/${all.length}` : '全部'}</span>
      </div>
      {exp && (
        <div className="mt-3 pt-3 space-y-3" style={{ borderTop: '1px solid var(--c-hair)' }}>
          <button onClick={toggleAll} className={`v-pill cursor-pointer transition-colors ${allSel ? '!bg-p-primary !text-p-on-primary' : ''}`}>{allSel ? '取消全选' : '全选'}</button>
          {Object.entries(PLATFORM_CATEGORIES).map(([cat, ps]) => {
            const catAll = ps.length > 0 && ps.every(p => selectedPlatforms.includes(p))
            const catPart = ps.some(p => selectedPlatforms.includes(p)) && !catAll
            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="t-subheading" style={{ fontSize: '11px', letterSpacing: '1px' }}>{cat}</span>
                  <button onClick={() => toggleCat(cat)} className="px-2 py-0.5 rounded-p-sm transition-colors cursor-pointer"
                    style={{ fontSize: '12px', fontWeight: 600, background: catAll ? 'var(--c-surface-soft)' : catPart ? '#fef3cd' : 'transparent', color: catAll ? 'var(--c-ink)' : catPart ? '#664d03' : 'var(--c-ash)' }}>
                    {catAll ? '取消' : '全选'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ps.map(p => { const c = PLATFORM_CONFIG[p]; const sel = selectedPlatforms.includes(p)
                    return <button key={p} onClick={() => toggle(p)} className="px-2.5 py-1 rounded-p-full transition-all cursor-pointer"
                      style={{ fontSize: '12px', fontWeight: sel ? 600 : 400, background: sel ? 'var(--c-primary)' : 'transparent', color: sel ? '#23251d' : 'var(--c-body)', border: sel ? 'none' : '1px solid var(--c-hair)', transform: sel ? 'scale(1.02)' : 'none' }}>
                      {c?.icon} {c?.name || p}</button> })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
