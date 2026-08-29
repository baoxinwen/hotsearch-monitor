import React, { useState, useEffect } from 'react'
import { Save, RefreshCw } from 'lucide-react'
import type { UserConfig } from '../types'
import { PLATFORM_CONFIG, PLATFORM_CATEGORIES } from '../constants'

interface Props {
  config: UserConfig | null
  onUpdate: (u: Partial<UserConfig>) => void
}

const ALL_PLATFORMS = Object.keys(PLATFORM_CONFIG)

export function SettingsModal({ config, onUpdate }: Props) {
  const [keywords, setKeywords] = useState(config?.keywords?.join('\n') || '')
  const [platforms, setPlatforms] = useState<string[]>(
    config?.platforms?.length ? config.platforms : ALL_PLATFORMS
  )
  const [interval, setInterval] = useState(config?.update_interval || 300)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'ok' | 'err'>('idle')

  // Sync config to local state
  useEffect(() => {
    if (!config) return
    setKeywords(config.keywords?.join('\n') || '')
    setPlatforms(config.platforms?.length ? config.platforms : ALL_PLATFORMS)
    setInterval(config.update_interval || 300)
  }, [config])

  const togglePlatform = (p: string) => {
    setPlatforms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    )
  }

  const selectAllCategory = (category: string) => {
    const catPlatforms = PLATFORM_CATEGORIES[category] || []
    const allSelected = catPlatforms.every(p => platforms.includes(p))
    setPlatforms(allSelected
      ? prev => prev.filter(p => !catPlatforms.includes(p))
      : prev => [...new Set([...prev, ...catPlatforms])]
    )
  }

  const handleSave = async () => {
    setSaveStatus('saving')
    try {
      const kw = keywords.split('\n').map(x => x.trim()).filter(Boolean)
      const allSelected = ALL_PLATFORMS.length > 0 && ALL_PLATFORMS.every(p => platforms.includes(p))
      await onUpdate({
        keywords: kw,
        platforms: allSelected ? [] : platforms,
        update_interval: interval,
      })
      setSaveStatus('ok')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch {
      setSaveStatus('err')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }

  const formatInterval = (sec: number) =>
    sec >= 3600 ? `${sec / 3600}小时` : `${sec / 60}分钟`

  return (
    <div className="animate-fade-in-up">
      <h2 className="t-heading mb-4">监控设置</h2>
      <div className="space-y-4">
        {/* Keywords */}
        <div className="card p-5">
          <h3 className="t-label">监控关键词</h3>
          <p className="t-helper mb-3">每行一个关键词，热搜标题包含任一关键词将被筛选</p>
          <textarea
            value={keywords}
            onChange={e => setKeywords(e.target.value)}
            placeholder="输入关键词，每行一个..."
            rows={5}
            className="v-textarea"
          />
        </div>

        {/* Platforms */}
        <div className="card p-5">
          <h3 className="t-label">监控平台</h3>
          <p className="t-helper mb-3">选择要监控的平台，已选 {platforms.length} 个</p>
          <div className="space-y-4">
            {Object.entries(PLATFORM_CATEGORIES).map(([category, catPlatforms]) => (
              <div key={category}>
                <div className="flex items-center justify-between mb-2">
                  <span className="t-subheading" style={{ fontSize: '11px', letterSpacing: '1px' }}>
                    {category}
                  </span>
                  <button
                    onClick={() => selectAllCategory(category)}
                    style={{ fontSize: '12px', fontWeight: 600, color: 'var(--c-primary)' }}
                    className="hover:underline cursor-pointer"
                  >
                    {catPlatforms.every(p => platforms.includes(p)) ? '取消全选' : '全选'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {catPlatforms.map(p => {
                    const cfg = PLATFORM_CONFIG[p]
                    const selected = platforms.includes(p)
                    return (
                      <button
                        key={p}
                        onClick={() => togglePlatform(p)}
                        className="px-2.5 py-1 rounded-p-full transition-all cursor-pointer"
                        style={{
                          fontSize: '12px',
                          fontWeight: selected ? 600 : 400,
                          background: selected ? 'var(--c-primary)' : 'transparent',
                          color: selected ? '#23251d' : 'var(--c-body)',
                          border: selected ? 'none' : '1px solid var(--c-hair)',
                          transform: selected ? 'scale(1.02)' : 'none',
                        }}
                      >
                        {cfg?.icon} {cfg?.name || p}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Update interval */}
        <div className="card p-5">
          <h3 className="t-label">更新间隔</h3>
          <div className="flex items-center gap-4 mt-3">
            <input
              type="range"
              min={60}
              max={3600}
              step={60}
              value={interval}
              onChange={e => setInterval(Number(e.target.value))}
              className="flex-1 accent-p-primary"
            />
            <span className="tnum" style={{
              fontSize: '14px', fontWeight: 600,
              color: 'var(--c-ink)', width: '64px', textAlign: 'right',
            }}>
              {formatInterval(interval)}
            </span>
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saveStatus === 'saving'}
          className="v-btn-primary flex items-center gap-2"
        >
          {saveStatus === 'saving'
            ? <RefreshCw size={14} className="animate-spin" />
            : <Save size={14} />
          }
          {saveStatus === 'ok' ? '已保存' : saveStatus === 'err' ? '保存失败' : '保存设置'}
        </button>
      </div>
    </div>
  )
}
