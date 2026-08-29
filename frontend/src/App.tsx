import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { Sidebar } from './components/Sidebar'
import { Dashboard } from './components/Dashboard'
import { AnalysisView } from './components/AnalysisView'
import { HistoryView } from './components/HistoryView'
import { EmailModal } from './components/EmailModal'
import { SettingsModal } from './components/SettingsModal'
import { FilterBar } from './components/FilterBar'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useTheme } from './hooks/useTheme'
import { useHotSearch } from './hooks/useHotSearch'
import type { ViewMode, HotSearchItem } from './types'
import { getStorageItem, setStorageItem, STORAGE_KEYS } from './utils/storage'

export default function App() {
  const { theme, isDark, setTheme } = useTheme()
  const [view, setView] = useState<ViewMode>('dashboard')
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(
    () => getStorageItem(STORAGE_KEYS.SELECTED_PLATFORMS, [])
  )
  const [justUpdated, setJustUpdated] = useState(false)
  const prevLoadingRef = useRef(false)

  const {
    data, errors, loading, loadingPlatforms,
    updateTime, config, fetchHotSearch, refreshPlatform,
    updateConfig, searchQuery, setSearchQuery,
  } = useHotSearch()

  // 检测加载完成，显示短暂提示
  useEffect(() => {
    if (prevLoadingRef.current && !loading) {
      setJustUpdated(true)
      const timer = setTimeout(() => setJustUpdated(false), 3000)
      return () => clearTimeout(timer)
    }
    prevLoadingRef.current = loading
  }, [loading])

  const handleThemeToggle = useCallback(() => setTheme(isDark ? 'light' : 'dark'), [isDark, setTheme])
  const handleTermClick = useCallback((term: string) => { setSearchQuery(term); setView('dashboard') }, [setSearchQuery])
  const handlePlatformsChange = useCallback((platforms: string[]) => {
    setSelectedPlatforms(platforms); setStorageItem(STORAGE_KEYS.SELECTED_PLATFORMS, platforms)
  }, [])

  const dashboardData = useMemo(() => {
    if (selectedPlatforms.length === 0) return data
    return Object.fromEntries(selectedPlatforms.filter(p => data[p]).map(p => [p, data[p]]))
  }, [data, selectedPlatforms])

  const renderView = () => {
    switch (view) {
      case 'dashboard': return (
        <div>
          <FilterBar selectedPlatforms={selectedPlatforms} onPlatformsChange={handlePlatformsChange} searchQuery={searchQuery} onSearchChange={setSearchQuery} />
          <Dashboard data={dashboardData} loadingPlatforms={loadingPlatforms} onRefreshPlatform={refreshPlatform} searchQuery={searchQuery} />
        </div>
      )
      case 'analysis': return <AnalysisView onTermClick={handleTermClick} isDark={isDark} selectedPlatforms={selectedPlatforms} />
      case 'history': return <HistoryView />
      case 'settings': return <div className="space-y-6"><EmailModal config={config} onUpdate={updateConfig} /><SettingsModal config={config} onUpdate={updateConfig} /></div>
      default: return null
    }
  }

  return (
    <div className="flex h-screen font-ph" style={{ background: 'var(--c-canvas)', color: 'var(--c-ink)' }}>
      <Sidebar currentView={view} onViewChange={setView} isDark={isDark} onThemeToggle={handleThemeToggle} onRefresh={() => fetchHotSearch(true)} loading={loading} />
      <main className="flex-1 overflow-y-auto" style={{ background: 'var(--c-canvas)' }}>
        {/* 微妙暖色渐变点缀 */}
        <div className="absolute top-0 right-0 w-96 h-96 pointer-events-none opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #f7a501 0%, transparent 70%)' }} />
        <div className="max-w-7xl mx-auto p-4 lg:p-8 relative">
          <div className="flex items-center justify-between mb-6">
            <div className="lg:hidden w-10" />
            <div className="text-center flex-1">
              {updateTime && <p className="tnum t-caption">最后更新: {updateTime}</p>}
            </div>
            <div className="text-right">
              {loading ? (
                <span className="inline-flex items-center gap-1.5 t-caption" style={{ color: 'var(--c-primary)' }}>
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--c-primary)' }} />
                  正在更新...
                </span>
              ) : justUpdated ? (
                <span className="inline-flex items-center gap-1.5 t-caption" style={{ color: '#1aae39' }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: '#1aae39' }} />
                  更新完成
                </span>
              ) : null}
            </div>
          </div>
          <ErrorBoundary>{renderView()}</ErrorBoundary>
        </div>
      </main>
    </div>
  )
}
