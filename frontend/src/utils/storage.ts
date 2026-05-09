/** 类型安全的 localStorage 封装 - 来自 trendsentinel */

const PREFIX = 'hotsearch_monitor_'

export const STORAGE_KEYS = {
  THEME: `${PREFIX}theme`,
  SELECTED_PLATFORMS: `${PREFIX}selected_platforms`,
  AUTO_REFRESH: `${PREFIX}auto_refresh`,
  HISTORY: `${PREFIX}history`,
} as const

export function getStorageItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key)
    if (item === null) return defaultValue
    return JSON.parse(item) as T
  } catch {
    return defaultValue
  }
}

export function setStorageItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.warn('localStorage write failed:', e)
  }
}

export function removeStorageItem(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}
