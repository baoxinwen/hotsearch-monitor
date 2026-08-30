import { useMutation, useQuery, useQueryClient, type UseMutationResult } from '@tanstack/react-query'
import { toast } from 'sonner'
import { API } from './api'
import type {
  CacheStats,
  HistorySnapshot,
  HistorySnapshotSummary,
  HotSearchItem,
  HotsearchResponse,
  OverviewResponse,
  PlatformCategories,
  PlatformConfigMap,
  UserConfig,
} from '../types'

export const qk = {
  hotsearch: ['hotsearch'] as const,
  platforms: ['platforms'] as const,
  config: ['config'] as const,
  stats: ['stats'] as const,
  overview: (platforms?: string) => ['overview', platforms ?? 'all'] as const,
  historyDates: ['history', 'dates'] as const,
  historyDate: (date: string) => ['history', 'date', date] as const,
  snapshot: (id: string) => ['history', 'detail', id] as const,
}

/** 平台静态配置（名称/颜色/图标/分类），基本不变 */
export function usePlatforms() {
  return useQuery({
    queryKey: qk.platforms,
    queryFn: async () => {
      const r = await API.platforms() as { success: boolean; platforms: PlatformConfigMap; categories: PlatformCategories }
      if (!r.success) throw new Error('获取平台列表失败')
      return { platforms: r.platforms, categories: r.categories }
    },
    staleTime: Infinity,
    retry: 1,
  })
}

export function useConfig() {
  return useQuery({
    queryKey: qk.config,
    queryFn: async () => {
      const r = await API.getConfig() as { success: boolean; config: UserConfig }
      if (!r.success) throw new Error('获取配置失败')
      return r.config
    },
    staleTime: 60_000,
  })
}

/** 热搜主数据；按配置的 update_interval 轮询，标签页隐藏时暂停。
 *  轮询间隔统一从 config 读取，避免多观察者传入不同间隔相互覆盖。 */
export function useHotsearch() {
  const { data: config } = useConfig()
  return useQuery({
    queryKey: qk.hotsearch,
    queryFn: async () => {
      const r = await API.hotsearch() as HotsearchResponse
      if (!r.success) throw new Error('获取热搜数据失败')
      return r
    },
    refetchInterval: (config?.update_interval ?? 300) * 1000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
    retry: 1,
  })
}

/** 平台健康统计（失败计数 / 禁用列表），60s 轮询 */
export function useCacheStats(enabled: boolean) {
  return useQuery({
    queryKey: qk.stats,
    queryFn: async () => {
      const r = await API.cacheStats() as { success: boolean; stats: CacheStats }
      if (!r.success) throw new Error('获取缓存统计失败')
      return r.stats
    },
    enabled,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    retry: 1,
  })
}

export function useOverview(platforms?: string) {
  return useQuery({
    queryKey: qk.overview(platforms),
    queryFn: async () => {
      const r = await API.getAnalysisOverview(platforms) as OverviewResponse
      if (!r.success) throw new Error(r.message || '获取分析数据失败')
      return r
    },
    staleTime: 60_000,
  })
}

export function useHistoryDates() {
  return useQuery({
    queryKey: qk.historyDates,
    queryFn: async () => {
      const r = await API.getHistoryDates() as { success: boolean; dates: string[] }
      if (!r.success) throw new Error('获取历史日期失败')
      return r.dates
    },
    staleTime: 60_000,
  })
}

export function useHistoryByDate(date: string | null) {
  return useQuery({
    queryKey: qk.historyDate(date ?? ''),
    queryFn: async () => {
      const r = await API.getHistoryByDate(date!) as { success: boolean; snapshots: HistorySnapshotSummary[] }
      if (!r.success) throw new Error('获取快照列表失败')
      return r.snapshots
    },
    enabled: !!date,
    staleTime: 60_000,
  })
}

export function useSnapshotDetail(id: string | undefined) {
  return useQuery({
    queryKey: qk.snapshot(id ?? ''),
    queryFn: async () => {
      const r = await API.getSnapshotDetail(id!) as { success: boolean; snapshot: HistorySnapshot; message?: string }
      if (!r.success) throw new Error(r.message || '快照不存在')
      return r.snapshot
    },
    enabled: !!id,
    staleTime: 5 * 60_000,
  })
}

// ==================== Mutations ====================

type StandardMutation<TVars, TData> = UseMutationResult<TData, Error, TVars>

/** 刷新单平台：成功后原地合并进主数据缓存 */
export function useRefreshPlatform(): StandardMutation<string, { items: HotSearchItem[]; update_time: string }> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (platform: string) => {
      const r = await API.refreshPlatform(platform) as { success: boolean; data?: HotSearchItem[]; update_time?: string; error?: string; message?: string }
      if (!r.success) throw new Error(r.error || r.message || '刷新失败')
      return { items: r.data ?? [], update_time: r.update_time ?? '' }
    },
    onSuccess: ({ items, update_time }, platform) => {
      qc.setQueryData<HotsearchResponse>(qk.hotsearch, (prev) => {
        if (!prev) return prev
        return {
          ...prev,
          data: { ...prev.data, [platform]: items },
          update_time: update_time || prev.update_time,
        }
      })
      toast.success('刷新成功', { description: '平台数据已更新' })
    },
    onError: (e) => toast.error('刷新失败', { description: e.message }),
  })
}

/** 重新启用被禁用平台 */
export function useEnablePlatform(): StandardMutation<string, string> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (platform: string) => {
      const r = await API.enablePlatform(platform) as { success: boolean; message?: string }
      if (!r.success) throw new Error(r.message || '启用失败')
      return platform
    },
    onSuccess: (platform) => {
      qc.invalidateQueries({ queryKey: qk.hotsearch })
      qc.invalidateQueries({ queryKey: qk.stats })
      toast.success('已重新启用平台', { description: '正在重新拉取数据' })
      void platform
    },
    onError: (e) => toast.error('启用失败', { description: e.message }),
  })
}

/** 最新快照的 id（用于对比排名变化） */
export function useLatestSnapshotId() {
  return useQuery({
    queryKey: ['latestSnapshotId'] as const,
    queryFn: async () => {
      const dates = await (async () => {
        const r = await API.getHistoryDates() as { success: boolean; dates: string[] }
        return r.success ? r.dates : []
      })()
      if (dates.length === 0) return null
      const r = await API.getHistoryByDate(dates[0]) as { success: boolean; snapshots: HistorySnapshotSummary[] }
      const snaps = r.success ? r.snapshots : []
      return snaps.length ? snaps[snaps.length - 1].id : null
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
  })
}

/** 最新快照与上一快照的排名变化（「平台|标题」→ change）。
 *  不单独轮询：snapshotId 变化（有新快照）时自动重新获取。 */
export function useRankChanges() {
  const { data: snapshotId } = useLatestSnapshotId()
  return useQuery({
    queryKey: ['rankChanges', snapshotId] as const,
    queryFn: async () => {
      const r = await API.getSnapshotDelta(snapshotId!) as {
        success: boolean
        changes: Record<string, { title: string; platform: string; prev_rank: number; rank: number; delta: number; status: 'up' | 'down' | 'new' }>
      }
      if (!r.success) throw new Error('获取对比数据失败')
      return r.changes
    },
    enabled: !!snapshotId,
    staleTime: 60_000,
  })
}

/** 后端健康状态 */
export function useHealth() {
  return useQuery({
    queryKey: ['health'] as const,
    queryFn: async () => {
      const r = await API.health() as { status: string; uptime: string; platforms_count: number; keywords_count: number }
      return r
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}

/** 清除后端数据缓存 */
export function useClearCache() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const r = await API.clearCache() as { success: boolean; message?: string }
      if (!r.success) throw new Error(r.message || '清除失败')
      return true
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.hotsearch })
      void qc.invalidateQueries({ queryKey: qk.stats })
      toast.success('缓存已清除', { description: '正在重新抓取数据' })
    },
    onError: (e) => toast.error('清除失败', { description: e.message }),
  })
}

export function useUpdateConfig(): StandardMutation<Record<string, unknown>, UserConfig> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const r = await API.updateConfig(updates) as { success: boolean; config: UserConfig; message?: string }
      if (!r.success) throw new Error(r.message || '保存失败')
      return r.config
    },
    onSuccess: (config) => {
      qc.setQueryData(qk.config, config)
      toast.success('配置已保存')
    },
    onError: (e) => toast.error('保存失败', { description: e.message }),
  })
}

export function useDeleteSnapshot(): StandardMutation<string, string> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const r = await API.deleteSnapshot(id) as { success: boolean; message?: string }
      if (!r.success) throw new Error(r.message || '删除失败')
      return id
    },
    onSuccess: (id) => {
      qc.removeQueries({ queryKey: qk.snapshot(id) })
      qc.invalidateQueries({ queryKey: ['history'] })
      toast.success('快照已删除')
    },
    onError: (e) => toast.error('删除失败', { description: e.message }),
  })
}

export function useSendReport() {
  return useMutation({
    mutationFn: async () => {
      const r = await API.sendEmail() as { success: boolean; message?: string }
      if (!r.success) throw new Error(r.message || '发送失败')
      return r.message ?? '发送成功'
    },
    onSuccess: (message) => toast.success('报告已发送', { description: message }),
    onError: (e) => toast.error('发送失败', { description: e.message }),
  })
}

/** 用表单里当前填写的 SMTP 配置发测试邮件 */
export function useTestEmailWithConfig() {
  return useMutation({
    mutationFn: async (smtp: Record<string, unknown>) => {
      const r = await API.testEmailSend(smtp) as { success: boolean; message?: string }
      if (!r.success) throw new Error(r.message || '发送失败')
      return r.message ?? '发送成功'
    },
    onSuccess: (message) => toast.success('测试邮件已发送', { description: message }),
    onError: (e) => toast.error('发送失败', { description: e.message }),
  })
}

export function useTestWebhook() {
  return useMutation({
    mutationFn: async () => {
      const r = await API.testWebhook() as { success: boolean; message?: string }
      if (!r.success) throw new Error(r.message || '推送失败')
      return r.message ?? '推送成功'
    },
    onSuccess: (message) => toast.success('Webhook 已推送', { description: message }),
    onError: (e) => toast.error('推送失败', { description: e.message }),
  })
}
