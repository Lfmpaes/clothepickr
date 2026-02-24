import { Link, NavLink, Outlet } from 'react-router-dom'
import {
  Shirt,
  Sparkles,
  WashingMachine,
  Layers,
  SlidersHorizontal,
  Tags,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', label: 'Home', icon: Shirt },
  { to: '/items', label: 'Items', icon: Layers },
  { to: '/categories', label: 'Categories', icon: Tags },
  { to: '/outfits', label: 'Outfits', icon: Sparkles },
  { to: '/laundry', label: 'Laundry', icon: WashingMachine },
  { to: '/settings', label: 'Settings', icon: SlidersHorizontal },
]

export function AppShell() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-lg font-bold tracking-tight text-emerald-800">
            ClothePickr
          </Link>
          <nav className="hidden items-center gap-2 md:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-emerald-100 text-emerald-900'
                      : 'text-slate-700 hover:bg-slate-100',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white md:hidden">
        <div className="grid grid-cols-6">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 px-2 py-2 text-[11px] font-medium',
                  isActive ? 'text-emerald-800' : 'text-slate-500',
                )
              }
            >
              <item.icon className="h-4 w-4" aria-hidden />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="h-16 md:hidden" />
    </div>
  )
}
