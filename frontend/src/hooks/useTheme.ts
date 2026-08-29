import { useState, useEffect, useMemo } from 'react'
import { getStorageItem, setStorageItem, STORAGE_KEYS } from '../utils/storage'

type Theme = 'dark' | 'light' | 'system'

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() =>
    getStorageItem(STORAGE_KEYS.THEME, 'system')
  )
  const [systemDark, setSystemDark] = useState(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )

  // 监听系统主题变化
  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  const isDark = useMemo(() =>
    theme === 'dark' || (theme === 'system' && systemDark),
    [theme, systemDark]
  )

  useEffect(() => {
    const root = document.documentElement
    if (isDark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [isDark])

  const setTheme = (t: Theme) => {
    setThemeState(t)
    setStorageItem(STORAGE_KEYS.THEME, t)
  }

  return { theme, isDark, setTheme }
}
