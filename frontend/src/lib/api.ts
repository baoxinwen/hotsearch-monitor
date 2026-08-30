/** API 客户端 — CSRF 处理 + 超时 + 全部端点 */

const REQUEST_TIMEOUT = 30000

let csrfToken = ''

/** 仅供测试：重置模块级 CSRF token 缓存 */
export function resetCsrfToken() {
  csrfToken = ''
}

type ApiFetchOptions = RequestInit & { _retried?: boolean }

async function fetchCsrfToken(): Promise<string> {
  try {
    const resp = await fetch('/api/csrf-token', { signal: AbortSignal.timeout(5000) })
    const data = await resp.json()
    csrfToken = data.csrf_token || ''
    return csrfToken
  } catch {
    return ''
  }
}

export async function apiFetch<T = unknown>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  const method = (options.method || 'GET').toUpperCase()
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    if (!csrfToken) await fetchCsrfToken()
    if (csrfToken) headers['X-CSRF-Token'] = csrfToken
  }

  const resp = await fetch(path, {
    ...options,
    headers,
    signal: options.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT),
  })

  if (resp.status === 403 && !options._retried) {
    await fetchCsrfToken()
    return apiFetch<T>(path, { ...options, _retried: true, headers: undefined })
  }

  if (!resp.ok) {
    let message = `HTTP ${resp.status}`
    try {
      const err = await resp.json()
      if (err?.message) message = err.message
    } catch { /* 非 JSON 错误体 */ }
    throw new Error(message)
  }

  return resp.json() as Promise<T>
}

const qs = (params: Record<string, string | number | boolean | undefined>) => {
  const u = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') u.set(k, String(v))
  }
  const s = u.toString()
  return s ? `?${s}` : ''
}

export const API = {
  // ===== 热搜 =====
  hotsearch: (params?: { platforms?: string; force_refresh?: boolean }) =>
    apiFetch(`/api/hotsearch${qs(params ?? {})}`),
  platforms: () => apiFetch('/api/hotsearch/platforms'),
  cacheStats: () => apiFetch('/api/hotsearch/cache/stats'),
  refreshPlatform: (platform: string) => apiFetch(`/api/hotsearch/refresh/${platform}`, { method: 'POST' }),
  enablePlatform: (platform: string) => apiFetch(`/api/hotsearch/enable/${platform}`, { method: 'POST' }),
  clearCache: () => apiFetch('/api/hotsearch/cache/clear', { method: 'POST' }),

  // ===== 分析 =====
  getAnalysisOverview: (platforms?: string) =>
    apiFetch(`/api/analysis/overview${qs(platforms ? { platforms } : {})}`),

  // ===== 配置 =====
  getConfig: () => apiFetch('/api/config'),
  updateConfig: (updates: Record<string, unknown>) =>
    apiFetch('/api/config', { method: 'POST', body: JSON.stringify(updates) }),
  testEmail: () => apiFetch('/api/config/test-email', { method: 'POST' }),
  testWebhook: () => apiFetch('/api/config/test-webhook', { method: 'POST' }),

  // ===== 邮件 =====
  sendEmail: () => apiFetch('/api/email/send', { method: 'POST' }),
  testEmailSend: (smtpConfig?: Record<string, unknown>) =>
    apiFetch('/api/email/test', { method: 'POST', body: JSON.stringify(smtpConfig ?? {}) }),

  // ===== 历史 =====
  getHistoryDates: () => apiFetch('/api/history/dates'),
  getHistoryByDate: (date: string) => apiFetch(`/api/history/${date}`),
  getSnapshotDetail: (snapshotId: string) => apiFetch(`/api/history/detail/${snapshotId}`),
  deleteSnapshot: (snapshotId: string) => apiFetch(`/api/history/${snapshotId}`, { method: 'DELETE' }),

  /** 快照对比（Phase 3） */
  getSnapshotDelta: (snapshotId: string) => apiFetch(`/api/history/compare/${snapshotId}`),
} as const
