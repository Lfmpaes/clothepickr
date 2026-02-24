import { Link, NavLink, Outlet } from 'react-router-dom'
import {
  Shirt,
  Sparkles,
  WashingMachine,
  Layers,
  SlidersHorizontal,
  Tags,
  Moon,
  Sun,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BrandLogo } from '@/components/brand-logo'
import { useLocale } from '@/app/locale-context'
import { useTheme } from '@/app/theme-context'
import { cn } from '@/lib/utils'

export function AppShell() {
  const { theme, toggleTheme } = useTheme()
  const { t } = useLocale()
  const navItems = [
    { to: '/', label: t('nav.home'), icon: Shirt },
    { to: '/items', label: t('nav.items'), icon: Layers },
    { to: '/categories', label: t('nav.categories'), icon: Tags },
    { to: '/outfits', label: t('nav.outfits'), icon: Sparkles },
    { to: '/laundry', label: t('nav.laundry'), icon: WashingMachine },
    { to: '/settings', label: t('nav.settings'), icon: SlidersHorizontal },
  ]

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link
            to="/"
            className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70"
            aria-label={t('nav.homeAria')}
          >
            <BrandLogo compact />
          </Link>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? t('theme.switchToLight') : t('theme.switchToDark')}
              title={theme === 'dark' ? t('theme.switchToLight') : t('theme.switchToDark')}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <nav className="hidden items-center gap-2 md:flex">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5">
        <Outlet />
      </main>

      <nav className="safe-area-bottom-padding fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:hidden">
        <div className="grid grid-cols-6">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 px-2 py-2 text-[11px] font-medium',
                  isActive ? 'text-emerald-800 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400',
                )
              }
            >
              <item.icon className="h-4 w-4" aria-hidden />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="safe-area-bottom-offset md:hidden" />
    </div>
  )
}
