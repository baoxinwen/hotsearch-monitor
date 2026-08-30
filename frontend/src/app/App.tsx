import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { Skeleton } from '../components/ui'
import { AppProviders } from './providers'
import { Shell } from './Shell'
import { LivePage } from '../features/live/LivePage'
import { ArchivePage } from '../features/archive/ArchivePage'
import { SnapshotDetailPage } from '../features/archive/SnapshotDetailPage'
import { SettingsPage } from '../features/settings/SettingsPage'

// recharts 体积大（约一半 bundle），趋势分析按需加载
const InsightsPage = lazy(() =>
  import('../features/insights/InsightsPage').then((m) => ({ default: m.InsightsPage })),
)

function PageSuspense({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="space-y-4 p-6"><Skeleton className="h-8 w-64" /><Skeleton className="h-96 w-full" /></div>}>{children}</Suspense>
}

export default function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <Routes>
          <Route element={<Shell />}>
            <Route
              index
              element={
                <ErrorBoundary>
                  <LivePage />
                </ErrorBoundary>
              }
            />
            <Route
              path="insights"
              element={
                <PageSuspense>
                  <ErrorBoundary>
                    <InsightsPage />
                  </ErrorBoundary>
                </PageSuspense>
              }
            />
            <Route
              path="archive"
              element={
                <ErrorBoundary>
                  <ArchivePage />
                </ErrorBoundary>
              }
            />
            <Route
              path="archive/:id"
              element={
                <ErrorBoundary>
                  <SnapshotDetailPage />
                </ErrorBoundary>
              }
            />
            <Route
              path="settings"
              element={
                <ErrorBoundary>
                  <SettingsPage />
                </ErrorBoundary>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProviders>
  )
}
