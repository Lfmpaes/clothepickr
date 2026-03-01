import { Suspense, lazy, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { ConvexProvider, useConvexAuth, useQuery } from 'convex/react'
import { ConvexAuthProvider, useAuthActions } from '@convex-dev/auth/react'
import { AppShell } from '@/app/AppShell'
import { LocaleProvider } from '@/app/locale-provider'
import { PwaUpdatePrompt } from '@/app/PwaUpdatePrompt'
import { ThemeProvider } from '@/app/theme-provider'
import { cloudSyncEngine } from '@/lib/cloud/sync-engine'
import { initializeDatabase } from '@/lib/db'
import { isConvexConfigured, getConvexReactClient } from '@/lib/cloud/convex-client'
import { setConvexAuthActions, setConvexUser } from '@/lib/cloud/convex-auth'
import { api } from '../../convex/_generated/api'

const NotFoundPage = lazy(() =>
  import('@/app/pages/not-found').then((module) => ({ default: module.NotFoundPage })),
)
const CategoriesPage = lazy(() =>
  import('@/features/categories/categories-page').then((module) => ({
    default: module.CategoriesPage,
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

function RouteFallback() {
  return <div className="px-2 py-8" aria-hidden />
}

// Bridges Convex React auth state into module-level convex-auth state
function ConvexAuthBridge() {
  const { isAuthenticated } = useConvexAuth()
  const { signIn, signOut } = useAuthActions()
  const user = useQuery(api.users.currentUserIdentity)

  useEffect(() => {
    setConvexAuthActions(
      (provider, args) => signIn(provider, args) as unknown as Promise<void>,
      signOut,
    )
  }, [signIn, signOut])

  useEffect(() => {
    setConvexUser(isAuthenticated && user ? user : null)
  }, [isAuthenticated, user])

  return null
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
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
        </Routes>
      </Suspense>
      <PwaUpdatePrompt />
      <Analytics />
    </BrowserRouter>
  )
}

function AppWithConvex() {
  const convexClient = getConvexReactClient()

  useEffect(() => {
    let active = true

    const bootstrap = async () => {
      await initializeDatabase()
      if (!active) return
      await cloudSyncEngine.start()
    }

    void bootstrap()

    return () => {
      active = false
      cloudSyncEngine.stop()
    }
  }, [])

  return (
    <ConvexProvider client={convexClient}>
      <ConvexAuthProvider client={convexClient}>
        <ConvexAuthBridge />
        <AppRoutes />
      </ConvexAuthProvider>
    </ConvexProvider>
  )
}

function AppWithoutConvex() {
  useEffect(() => {
    let active = true

    const bootstrap = async () => {
      await initializeDatabase()
      if (!active) return
      await cloudSyncEngine.start()
    }

    void bootstrap()

    return () => {
      active = false
      cloudSyncEngine.stop()
    }
  }, [])

  return <AppRoutes />
}

export default function App() {
  return (
    <LocaleProvider>
      <ThemeProvider>
        {isConvexConfigured() ? <AppWithConvex /> : <AppWithoutConvex />}
      </ThemeProvider>
    </LocaleProvider>
  )
}
