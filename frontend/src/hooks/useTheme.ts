import { useCallback, useEffect, useState } from 'react'

export type Theme = 'dark' | 'light' | 'system'
const STORAGE_KEY = 'hotsearch_monitor_theme'

function readStored(): Theme {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return 'dark' // 首次使用默认深色
    const v = JSON.parse(raw)
    return v === 'dark' || v === 'light' || v === 'system' ? v : 'dark'
  } catch {
    return 'dark'
  }
}

function apply(theme: Theme): boolean {
  const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
  return dark
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(readStored)
  const [isDark, setIsDark] = useState<boolean>(() => apply(readStored()))

  // 跟随系统的实时监听
  useEffect(() => {
    if (theme !== 'system') return
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setIsDark(apply('system'))
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(t))
    setIsDark(apply(t))
  }, [])

  const toggle = useCallback(() => setTheme(isDark ? 'light' : 'dark'), [isDark, setTheme])

  return { theme, isDark, setTheme, toggle }
}
