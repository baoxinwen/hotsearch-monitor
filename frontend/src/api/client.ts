/** API 客户端 - CSRF 处理 + 类型封装 + 超时 */

const BASE_URL = ''
const REQUEST_TIMEOUT = 30000

let csrfToken = ''

type ApiFetchOptions = RequestInit & { _retried?: boolean }

async function fetchCsrfToken(): Promise<string> {
  try {
    const resp = await fetch(`${BASE_URL}/api/csrf-token`, { signal: AbortSignal.timeout(5000) })
    const data = await resp.json()
    csrfToken = data.csrf_token || ''
    return csrfToken
  } catch {
    return ''
  }
}

export async function apiFetch<T = any>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  // POST/PUT/DELETE 需要 CSRF token
  const method = (options.method || 'GET').toUpperCase()
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    if (!csrfToken) await fetchCsrfToken()
    if (csrfToken) headers['X-CSRF-Token'] = csrfToken
  }

  const resp = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    signal: options.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT),
  })

  // CSRF token 过期时重试
  if (resp.status === 403 && !options._retried) {
    await fetchCsrfToken()
    if (csrfToken) headers['X-CSRF-Token'] = csrfToken
    return apiFetch<T>(path, { ...options, _retried: true })
  }

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ message: `HTTP ${resp.status}` }))
    throw new Error(err.message || `HTTP ${resp.status}`)
  }

  return resp.json()
}

// API 端点
export const API = {
  hotsearch: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return apiFetch(`/api/hotsearch${qs}`)
  },
  platforms: () => apiFetch('/api/hotsearch/platforms'),
  refreshPlatform: (platform: string) => apiFetch(`/api/hotsearch/refresh/${platform}`, { method: 'POST' }),
  enablePlatform: (platform: string) => apiFetch(`/api/hotsearch/enable/${platform}`, { method: 'POST' }),

  getConfig: () => apiFetch('/api/config'),
  updateConfig: (config: any) => apiFetch('/api/config', { method: 'POST', body: JSON.stringify(config) }),
  testEmail: () => apiFetch('/api/config/test-email', { method: 'POST' }),
  testWebhook: () => apiFetch('/api/config/test-webhook', { method: 'POST' }),

  getKeywords: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return apiFetch(`/api/analysis/keywords${qs}`)
  },
  getAnalysisOverview: (platforms?: string) => {
    const qs = platforms ? '?' + new URLSearchParams({ platforms }).toString() : ''
    return apiFetch(`/api/analysis/overview${qs}`)
  },

  sendEmail: (body?: any) => apiFetch('/api/email/send', { method: 'POST', body: JSON.stringify(body || {}) }),
  testEmailSend: (to?: string, smtpConfig?: Record<string, string>) => apiFetch('/api/email/test', { method: 'POST', body: JSON.stringify({ to, ...smtpConfig }) }),

  getHistoryDates: () => apiFetch('/api/history/dates'),
  getHistoryByDate: (date: string) => apiFetch(`/api/history/${date}`),

  health: () => apiFetch('/health'),
}
