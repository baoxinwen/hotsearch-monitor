import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { AppProviders } from './providers'
import { Shell } from './Shell'
import { LivePage } from '../features/live/LivePage'
import { InsightsPage } from '../features/insights/InsightsPage'
import { ArchivePage } from '../features/archive/ArchivePage'
import { SnapshotDetailPage } from '../features/archive/SnapshotDetailPage'
import { SettingsPage } from '../features/settings/SettingsPage'

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
                <ErrorBoundary>
                  <InsightsPage />
                </ErrorBoundary>
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
            <Route path="archive/:id" element={<SnapshotDetailPage />} />
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
