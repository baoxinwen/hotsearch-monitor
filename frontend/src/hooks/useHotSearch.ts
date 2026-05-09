import { useState, useCallback, useRef, useEffect } from 'react'
import type { HotSearchItem, UserConfig } from '../types'
import { API } from '../api/client'

interface UseHotSearchReturn {
  data: Record<string, HotSearchItem[]>
  errors: Record<string, string>
  loading: boolean
  loadingPlatforms: Record<string, boolean>
  updateTime: string
  config: UserConfig | null
  fetchHotSearch: (forceRefresh?: boolean) => Promise<void>
  refreshPlatform: (platform: string) => Promise<void>
  updateConfig: (updates: Partial<UserConfig>) => Promise<void>
  searchQuery: string
  setSearchQuery: (q: string) => void
}

export function useHotSearch(): UseHotSearchReturn {
  const [data, setData] = useState<Record<string, HotSearchItem[]>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [loadingPlatforms, setLoadingPlatforms] = useState<Record<string, boolean>>({})
  const [updateTime, setUpdateTime] = useState('')
  const [config, setConfig] = useState<UserConfig | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const fetchHotSearch = useCallback(async (forceRefresh = false) => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (forceRefresh) params.force_refresh = 'true'
      const resp = await API.hotsearch(params) as any
      if (resp.success) {
        setData(resp.data || {})
        setErrors(resp.errors || {})
        setUpdateTime(resp.update_time || '')
      }
    } catch (e) {
      console.error('Fetch hotsearch failed:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshPlatform = useCallback(async (platform: string) => {
    setLoadingPlatforms(prev => ({ ...prev, [platform]: true }))
    try {
      const resp = await API.refreshPlatform(platform) as any
      if (resp.success && resp.data) {
        setData(prev => ({ ...prev, [platform]: resp.data }))
      }
    } catch (e) {
      console.error(`Refresh ${platform} failed:`, e)
    } finally {
      setLoadingPlatforms(prev => ({ ...prev, [platform]: false }))
    }
  }, [])

  const fetchConfig = useCallback(async () => {
    try {
      const resp = await API.getConfig() as any
      if (resp.success) setConfig(resp.config)
    } catch (e) {
      console.error('Fetch config failed:', e)
    }
  }, [])

  const updateConfig = useCallback(async (updates: Partial<UserConfig>) => {
    try {
      const resp = await API.updateConfig(updates) as any
      if (resp.success) {
        setConfig(resp.config)
        fetchHotSearch(true)
      } else {
        throw new Error(resp.message || '保存失败')
      }
    } catch (e) {
      console.error('Update config failed:', e)
      throw e
    }
  }, [fetchHotSearch])

  // 初始加载
  useEffect(() => {
    fetchConfig()
    fetchHotSearch()
  }, [fetchConfig, fetchHotSearch])

  // 自动刷新（递归 setTimeout，避免请求重叠）
  useEffect(() => {
    let cancelled = false
    const poll = async () => {
      if (cancelled) return
      await fetchHotSearch()
      if (!cancelled) {
        timerRef.current = setTimeout(poll, (config?.update_interval || 300) * 1000)
      }
    }
    poll()
    return () => {
      cancelled = true
      clearTimeout(timerRef.current)
    }
  }, [config?.update_interval, fetchHotSearch])

  return {
    data, errors, loading, loadingPlatforms,
    updateTime, config, fetchHotSearch, refreshPlatform,
    updateConfig, searchQuery, setSearchQuery,
  }
}
