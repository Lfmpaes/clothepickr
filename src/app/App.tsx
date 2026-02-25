import { Suspense, lazy, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { AppShell } from '@/app/AppShell'
import { LocaleProvider } from '@/app/locale-provider'
import { PwaUpdatePrompt } from '@/app/PwaUpdatePrompt'
import { ThemeProvider } from '@/app/theme-provider'
import { cloudSyncEngine } from '@/lib/cloud/sync-engine'
import { initializeDatabase } from '@/lib/db'

const NotFoundPage = lazy(() =>
  import('@/app/pages/not-found').then((module) => ({ default: module.NotFoundPage })),
)
const CategoriesPage = lazy(() =>
  import('@/features/categories/categories-page').then((module) => ({
    default: module.CategoriesPage,
  })),
)
const AuthCallbackPage = lazy(() =>
  import('@/features/auth/auth-callback-page').then((module) => ({
    default: module.AuthCallbackPage,
  })),
)
const DashboardPage = lazy(() =>
  import('@/features/dashboard/dashboard-page').then((module) => ({
    default: module.DashboardPage,
  })),
)
const ItemDetailPage = lazy(() =>
  import('@/features/items/item-detail-page').then((module) => ({
    default: module.ItemDetailPage,
  })),
)
const ItemNewPage = lazy(() =>
  import('@/features/items/item-new-page').then((module) => ({
    default: module.ItemNewPage,
  })),
)
const ItemsPage = lazy(() =>
  import('@/features/items/items-page').then((module) => ({ default: module.ItemsPage })),
)
const LaundryPage = lazy(() =>
  import('@/features/laundry/laundry-page').then((module) => ({
    default: module.LaundryPage,
  })),
)
const OutfitEditorPage = lazy(() =>
  import('@/features/outfits/outfit-editor-page').then((module) => ({
    default: module.OutfitEditorPage,
  })),
)
const OutfitsPage = lazy(() =>
  import('@/features/outfits/outfits-page').then((module) => ({ default: module.OutfitsPage })),
)
const SettingsPage = lazy(() =>
  import('@/features/settings/settings-page').then((module) => ({
    default: module.SettingsPage,
  })),
)
const AuthCallbackPage = lazy(() =>
  import('@/features/auth/auth-callback-page').then((module) => ({
    default: module.AuthCallbackPage,
  })),
)

function RouteFallback() {
  return <div className="px-2 py-8" aria-hidden />
}

export default function App() {
  useEffect(() => {
    const initializeApp = async () => {
      await initializeDatabase()
      await cloudSyncEngine.start()
    }

    void initializeApp()
  }, [])

  return (
    <LocaleProvider>
      <ThemeProvider>
        <BrowserRouter>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
              <Route element={<AppShell />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/items" element={<ItemsPage />} />
                <Route path="/items/new" element={<ItemNewPage />} />
                <Route path="/items/:id" element={<ItemDetailPage />} />
                <Route path="/categories" element={<CategoriesPage />} />
                <Route path="/outfits" element={<OutfitsPage />} />
                <Route path="/outfits/new" element={<OutfitEditorPage />} />
                <Route path="/outfits/:id" element={<OutfitEditorPage />} />
                <Route path="/laundry" element={<LaundryPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/home" element={<Navigate to="/" replace />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
            </Routes>
          </Suspense>
          <PwaUpdatePrompt />
          <Analytics />
        </BrowserRouter>
      </ThemeProvider>
    </LocaleProvider>
  )
}
