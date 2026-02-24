import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { AppShell } from '@/app/AppShell'
import { LocaleProvider } from '@/app/locale-provider'
import { PwaUpdatePrompt } from '@/app/PwaUpdatePrompt'
import { ThemeProvider } from '@/app/theme-provider'
import { NotFoundPage } from '@/app/pages/not-found'
import { CategoriesPage } from '@/features/categories/categories-page'
import { DashboardPage } from '@/features/dashboard/dashboard-page'
import { ItemDetailPage } from '@/features/items/item-detail-page'
import { ItemNewPage } from '@/features/items/item-new-page'
import { ItemsPage } from '@/features/items/items-page'
import { LaundryPage } from '@/features/laundry/laundry-page'
import { OutfitEditorPage } from '@/features/outfits/outfit-editor-page'
import { OutfitsPage } from '@/features/outfits/outfits-page'
import { SettingsPage } from '@/features/settings/settings-page'
import { initializeDatabase } from '@/lib/db'

export default function App() {
  useEffect(() => {
    void initializeDatabase()
  }, [])

  return (
    <LocaleProvider>
      <ThemeProvider>
        <BrowserRouter>
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
          <PwaUpdatePrompt />
          <Analytics />
        </BrowserRouter>
      </ThemeProvider>
    </LocaleProvider>
  )
}
