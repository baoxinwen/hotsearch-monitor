/** 热搜条目 */
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

/** 平台配置 */
export interface PlatformInfo {
  name: string
  category: string
  color: string
  icon: string
  url: string
}

/** 邮件配置 */
export interface EmailConfig {
  enabled: boolean
  recipients: string[]
  frequency: 'hourly' | 'daily' | 'weekly'
  sendTime: string
}

/** 用户配置 */
export interface UserConfig {
  version: string
  keywords: string[]
  platforms: string[]
  update_interval: number
  email_enabled: boolean
  email_to: string[]
  email_frequency: 'hourly' | 'daily' | 'weekly'
  email_time: string
  smtp_host?: string
  smtp_port?: string | number
  smtp_user?: string
  smtp_password?: string
  mail_from?: string
  webhook_enabled?: boolean
  webhook_url?: string
  webhook_type?: 'generic' | 'wechat' | 'dingtalk' | 'feishu'
}

/** 历史快照 */
export interface HistorySnapshot {
  id: string
  timestamp: number
  date: string
  time: string
  data: Record<string, HotSearchItem[]>
  filtered_data: Record<string, HotSearchItem[]>
  total_count: number
  filtered_count: number
  errors: Record<string, string>
}

/** 视图模式 */
export type ViewMode = 'dashboard' | 'analysis' | 'history' | 'settings'

/** API 响应 */
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
}

/** 趋势关键词 */
export interface TrendKeyword {
  term: string
  count: number
}
