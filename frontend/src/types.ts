/** 后端 API 数据契约（与 backend/routes 对齐） */

export interface HotSearchItem {
  id: string
  rank: number
  title: string
  score: number
  platform: string
  url: string
  category?: string
  hot_display?: string
  timestamp: number
}

export interface PlatformInfo {
  name: string
  category: string
  color: string
  icon: string
  url: string
}

export type PlatformConfigMap = Record<string, PlatformInfo>
export type PlatformCategories = Record<string, string[]>

export type EmailFrequency = 'hourly' | 'daily' | 'weekly'
export type WebhookType = 'generic' | 'wechat' | 'dingtalk' | 'feishu'

export interface UserConfig {
  version: string
  keywords: string[]
  platforms: string[]
  update_interval: number
  email_enabled: boolean
  email_to: string[]
  email_frequency: EmailFrequency
  email_time: string
  smtp_host?: string
  smtp_port?: string | number
  smtp_user?: string
  smtp_password?: string
  mail_from?: string
  webhook_enabled?: boolean
  webhook_url?: string
  webhook_type?: WebhookType
  stop_words?: string[]
  min_term_length?: number
}

export interface HotsearchResponse {
  success: boolean
  data: Record<string, HotSearchItem[]>
  filtered?: Record<string, HotSearchItem[]>
  errors: Record<string, string>
  update_time: string
  disabled_platforms: string[]
}

export interface CacheStats {
  cached_platforms: number
  disabled_platforms: string[]
  failure_counts: Record<string, number>
  api_keys_total: number
  api_keys_exhausted: number
}

export interface HistorySnapshotSummary {
  id: string
  timestamp: number
  date: string
  time: string
  total_count: number
  filtered_count: number
  keywords: string[]
}

export interface HistorySnapshot {
  id: string
  timestamp: number
  date: string
  time: string
  data: Record<string, HotSearchItem[]>
  filtered_data?: Record<string, HotSearchItem[]>
  total_count: number
  filtered_count: number
  errors?: Record<string, string>
  keywords?: string[]
}

export interface TrendKeyword {
  term: string
  count: number
}

export interface KeywordTrendPoint {
  time: string
  timestamp: number
  counts: Record<string, number>
  total_items: number
}

export interface OverviewData {
  keywords: TrendKeyword[]
  platform_distribution: { platform: string; count: number; avg_score: number }[]
  category_heat: { category: string; count: number; total_score: number; avg_score: number; platform_count: number }[]
  top_items: { rank: number; title: string; score: number; hot_display: string; platform: string; url: string }[]
  heat_distribution: { label: string; count: number }[]
  cross_platform: { title: string; platform_count: number; platforms: string[]; score: number }[]
  keyword_trend: KeywordTrendPoint[]
}

export interface OverviewResponse {
  success: boolean
  data: OverviewData
  total_items: number
  platforms_analyzed: number
  message?: string
}

/** 快照对比（Phase 3 新增接口） */
export interface SnapshotDelta {
  baseline_id: string
  previous_id: string
  /** key 为条目 id */
  changes: Record<
    string,
    { title: string; platform: string; prev_rank: number; rank: number; delta: number; status: 'up' | 'down' | 'new' }
  >
}
