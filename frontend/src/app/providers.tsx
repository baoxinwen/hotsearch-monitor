import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { TooltipProvider } from '../components/overlay'
import { applyUIDocumentAttrs, useUIStore } from '../lib/store'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: true,
    },
  },
})

/** 密度 / 减少动效 → <html> data 属性 */
function UIDocumentAttrs() {
  const density = useUIStore((s) => s.density)
  const reduceMotion = useUIStore((s) => s.reduceMotion)
  useEffect(() => applyUIDocumentAttrs(density, reduceMotion), [density, reduceMotion])
  return null
}

/** 每秒心跳，供相对时间 / 倒计时刷新（在 Topbar 内实现） */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={300}>
        <UIDocumentAttrs />
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--c-surface)',
              border: '1px solid var(--c-hair)',
              color: 'var(--c-ink)',
              fontFamily: 'inherit',
              fontSize: '13px',
            },
          }}
        />
      </TooltipProvider>
    </QueryClientProvider>
  )
}

export { queryClient }
