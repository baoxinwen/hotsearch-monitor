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
    }),
    {
      name: 'hotsearch_monitor_ui',
      storage: createJSONStorage(() => localStorage),
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
