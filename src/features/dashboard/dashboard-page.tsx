import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { Shirt, Sparkles, WashingMachine } from 'lucide-react'
import { BrandLogo } from '@/components/brand-logo'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/page-header'
import { itemRepository, outfitRepository } from '@/lib/db'
import { STATUS_LABEL, STATUS_ORDER } from '@/lib/constants'

export function DashboardPage() {
  const items = useLiveQuery(() => itemRepository.list(), [], [])
  const outfits = useLiveQuery(() => outfitRepository.list(), [], [])

  const byStatus = STATUS_ORDER.map((status) => ({
    status,
    count: items.filter((item) => item.status === status).length,
  }))

  const favoriteOutfits = outfits.filter((outfit) => outfit.isFavorite).length

  return (
    <section>
      <PageHeader
        title="Wardrobe Overview"
        subtitle="Track what is clean, what needs care, and your saved styles."
        actions={
          <>
            <Link to="/items/new">
              <Button>Add Item</Button>
            </Link>
            <Link to="/outfits/new">
              <Button variant="secondary">Create Outfit</Button>
            </Link>
          </>
        }
      />

      <Card className="mb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <BrandLogo />
          <div className="flex items-center gap-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 dark:bg-slate-800">
              <Shirt className="h-3.5 w-3.5" /> Catalog
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 dark:bg-slate-800">
              <WashingMachine className="h-3.5 w-3.5" /> Laundry
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 dark:bg-slate-800">
              <Sparkles className="h-3.5 w-3.5" /> Styles
            </span>
          </div>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {byStatus.map((row) => (
          <Card key={row.status}>
            <CardDescription>{STATUS_LABEL[row.status]}</CardDescription>
            <CardTitle className="mt-2 text-2xl">{row.count}</CardTitle>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-3 lg:grid-cols-2">
        <Card>
          <CardDescription>Catalog size</CardDescription>
          <CardTitle className="mt-2 text-2xl">{items.length} items</CardTitle>
          <Link to="/items" className="mt-4 inline-block">
            <Button variant="outline">View Items</Button>
          </Link>
        </Card>
        <Card>
          <CardDescription>Favorite outfits</CardDescription>
          <CardTitle className="mt-2 text-2xl">{favoriteOutfits}</CardTitle>
          <Link to="/outfits" className="mt-4 inline-block">
            <Button variant="outline">Manage Outfits</Button>
          </Link>
        </Card>
      </div>
    </section>
  )
}
