import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type Density = 'cozy' | 'compact'
export type LiveView = 'feed' | 'board'

interface UIState {
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  density: Density
  setDensity: (d: Density) => void
  reduceMotion: boolean
  setReduceMotion: (v: boolean) => void
  liveView: LiveView
  setLiveView: (v: LiveView) => void
  /** 平台筛选（空数组 = 全部） */
  platformFilter: string[]
  setPlatformFilter: (p: string[]) => void
  /** 命令面板是否打开（快捷键系统据此暂停，避免穿透） */
  paletteOpen: boolean
  setPaletteOpen: (v: boolean) => void
}

export const LEGACY_SELECTED_PLATFORMS_KEY = 'hotsearch_monitor_selected_platforms'

function readLegacyPlatforms(): string[] {
  try {
    const raw = localStorage.getItem(LEGACY_SELECTED_PLATFORMS_KEY)
    if (!raw) return []
    const v = JSON.parse(raw)
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      density: 'cozy',
      setDensity: (d) => set({ density: d }),
      reduceMotion: false,
      setReduceMotion: (v) => set({ reduceMotion: v }),
      liveView: 'feed',
      setLiveView: (v) => set({ liveView: v }),
      platformFilter: readLegacyPlatforms(),
      setPlatformFilter: (p) => set({ platformFilter: p }),
      paletteOpen: false,
      setPaletteOpen: (v) => set({ paletteOpen: v }),
    }),
    {
      name: 'hotsearch_monitor_ui',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // 只持久化有意义的偏好；paletteOpen 等瞬态状态除外
      partialize: (s) => ({
        sidebarCollapsed: s.sidebarCollapsed,
        density: s.density,
        reduceMotion: s.reduceMotion,
        liveView: s.liveView,
        platformFilter: s.platformFilter,
      }),
      // 白名单式迁移：丢弃旧结构残留/未知字段（如曾被写入的瞬态 paletteOpen）
      migrate: (persisted) => ({
        sidebarCollapsed: !!(persisted as Record<string, unknown>)?.sidebarCollapsed,
        density: (persisted as Record<string, unknown>)?.density === 'compact' ? 'compact' : 'cozy',
        reduceMotion: !!(persisted as Record<string, unknown>)?.reduceMotion,
        liveView: (persisted as Record<string, unknown>)?.liveView === 'board' ? 'board' : 'feed',
        platformFilter: Array.isArray((persisted as Record<string, unknown>)?.platformFilter)
          ? (persisted as { platformFilter: string[] }).platformFilter
          : [],
      }),
    },
  ),
)

/** 把密度 / 减少动效同步到 <html> data 属性（tokens.css 消费） */
export function applyUIDocumentAttrs(density: Density, reduceMotion: boolean) {
  const root = document.documentElement
  if (density === 'compact') root.dataset.density = 'compact'
  else delete root.dataset.density
  if (reduceMotion) root.dataset.motion = 'reduced'
  else delete root.dataset.motion
}
