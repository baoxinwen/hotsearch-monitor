import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch, resetCsrfToken } from './api'

// fetch mock（保留 AbortSignal.timeout 可用性）
const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

const jsonResponse = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))

beforeEach(() => {
  fetchMock.mockReset()
  resetCsrfToken()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('apiFetch CSRF', () => {
  it('POST 请求先取 CSRF token 再携带请求头', async () => {
    fetchMock
      .mockImplementationOnce(() => jsonResponse({ csrf_token: 'tok-1' })) // GET /api/csrf-token
      .mockImplementationOnce(() => jsonResponse({ success: true })) // POST
    const r = await apiFetch('/api/config', { method: 'POST', body: '{}' })
    expect(r).toEqual({ success: true })
    const postCall = fetchMock.mock.calls[1]
    expect(postCall[0]).toBe('/api/config')
    expect(postCall[1].headers['X-CSRF-Token']).toBe('tok-1')
  })

  it('403 时刷新 token 并重试一次', async () => {
    fetchMock
      .mockImplementationOnce(() => jsonResponse({ csrf_token: 'expired' }))
      .mockImplementationOnce(() => jsonResponse({ message: 'CSRF token 无效或已过期' }, 403))
      .mockImplementationOnce(() => jsonResponse({ csrf_token: 'fresh' }))
      .mockImplementationOnce(() => jsonResponse({ success: true }))
    const r = await apiFetch('/api/config', { method: 'POST', body: '{}' })
    expect(r).toEqual({ success: true })
    // 第 3 次 fetch 是刷新 token，第 4 次是重试的 POST
    expect(fetchMock.mock.calls[2][0]).toBe('/api/csrf-token')
    expect(fetchMock.mock.calls[3][1].headers['X-CSRF-Token']).toBe('fresh')
    expect(fetchMock).toHaveBeenCalledTimes(4)
  })

  it('GET 请求不带 CSRF header', async () => {
    fetchMock.mockImplementationOnce(() => jsonResponse({ success: true }))
    await apiFetch('/api/hotsearch')
    expect(fetchMock.mock.calls[0][1].headers['X-CSRF-Token']).toBeUndefined()
  })

  it('非 2xx 抛出后端 message', async () => {
    fetchMock.mockImplementationOnce(() => jsonResponse({ message: '快照不存在' }, 404))
    await expect(apiFetch('/api/history/detail/xx')).rejects.toThrow('快照不存在')
  })
})
