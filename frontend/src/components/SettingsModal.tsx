import React, { useState, useEffect } from 'react'
import { Save, RefreshCw } from 'lucide-react'
import type { UserConfig } from '../types'
import { PLATFORM_CONFIG, PLATFORM_CATEGORIES } from '../constants'

interface Props { config: UserConfig | null; onUpdate: (u: Partial<UserConfig>) => void }
const ALL = Object.keys(PLATFORM_CONFIG)

export function SettingsModal({ config, onUpdate }: Props) {
  const [kw, setKw] = useState(config?.keywords?.join('\n') || '')
  const [plats, setPlats] = useState<string[]>(config?.platforms?.length ? config.platforms : ALL)
  const [interval, setInterval] = useState(config?.update_interval || 300)
  const [ss, setSs] = useState<'idle'|'s'|'ok'|'err'>('idle')

  useEffect(() => { if (config) { setKw(config.keywords?.join('\n')||''); setPlats(config.platforms?.length?config.platforms:ALL); setInterval(config.update_interval||300) } }, [config])

  const toggle = (p: string) => setPlats(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
  const selAll = (c: string) => { const cp = PLATFORM_CATEGORIES[c]||[]; const all = cp.every(p => plats.includes(p)); setPlats(all ? prev => prev.filter(p => !cp.includes(p)) : prev => [...new Set([...prev, ...cp])]) }

  const save = async () => { setSs('s'); try { const k = kw.split('\n').map(x=>x.trim()).filter(Boolean); const all = ALL.length>0 && ALL.every(p=>plats.includes(p)); await onUpdate({ keywords: k, platforms: all?[]:plats, update_interval: interval }); setSs('ok'); setTimeout(()=>setSs('idle'),2000) } catch { setSs('err'); setTimeout(()=>setSs('idle'),3000) } }

  return (
    <div>
      <h2 className="t-heading mb-4">监控设置</h2>
      <div className="space-y-4">
        <div className="card p-5"><h3 className="t-label">监控关键词</h3><p className="t-helper mb-3">每行一个关键词，热搜标题包含任一关键词将被筛选</p>
          <textarea value={kw} onChange={e => setKw(e.target.value)} placeholder="输入关键词，每行一个..." rows={5} className="v-textarea" /></div>
        <div className="card p-5"><h3 className="t-label">监控平台</h3><p className="t-helper mb-3">选择要监控的平台，已选 {plats.length} 个</p>
          <div className="space-y-4">{Object.entries(PLATFORM_CATEGORIES).map(([cat, cp]) => (
            <div key={cat}>
              <div className="flex items-center justify-between mb-2">
                <span className="t-subheading" style={{ fontSize: '11px', letterSpacing: '1px' }}>{cat}</span>
                <button onClick={() => selAll(cat)} style={{ fontSize: '12px', fontWeight: 600, color: 'var(--c-primary)' }} className="hover:underline cursor-pointer">{cp.every(p=>plats.includes(p))?'取消全选':'全选'}</button></div>
              <div className="flex flex-wrap gap-1.5">{cp.map(p => { const c = PLATFORM_CONFIG[p]; const sel = plats.includes(p)
                return <button key={p} onClick={() => toggle(p)} className="px-2.5 py-1 rounded-p-full transition-all cursor-pointer"
                  style={{ fontSize: '12px', fontWeight: sel?600:400, background: sel?'var(--c-primary)':'transparent', color: sel?'#23251d':'var(--c-body)', border: sel?'none':'1px solid var(--c-hair)', transform: sel?'scale(1.02)':'none' }}>{c?.icon} {c?.name||p}</button> })}</div>
            </div>))}</div></div>
        <div className="card p-5"><h3 className="t-label">更新间隔</h3>
          <div className="flex items-center gap-4 mt-3"><input type="range" min={60} max={3600} step={60} value={interval} onChange={e => setInterval(Number(e.target.value))} className="flex-1 accent-p-primary" />
            <span className="tnum" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--c-ink)', width: '64px', textAlign: 'right' }}>{interval>=3600?`${interval/3600}小时`:`${interval/60}分钟`}</span></div></div>
        <button onClick={save} disabled={ss==='s'} className="v-btn-primary flex items-center gap-2">
          {ss==='s'?<RefreshCw size={14} className="animate-spin"/>:<Save size={14}/>}{ss==='ok'?'已保存':ss==='err'?'保存失败':'保存设置'}</button>
      </div>
    </div>
  )
}
