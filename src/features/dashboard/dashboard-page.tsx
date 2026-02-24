import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { Shirt, Sparkles, WashingMachine } from 'lucide-react'
import { BrandLogo } from '@/components/brand-logo'
import { StatusPanelIcon } from '@/components/status-panel-icon'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/page-header'
import { useLocale } from '@/app/locale-context'
import { itemRepository, outfitRepository } from '@/lib/db'
import { STATUS_ORDER } from '@/lib/constants'
import { getLocalizedStatusLabel } from '@/lib/i18n/helpers'

export function DashboardPage() {
  const { t } = useLocale()
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
        title={t('dashboard.title')}
        subtitle={t('dashboard.subtitle')}
        actions={
          <>
            <Link to="/items/new">
              <Button>{t('dashboard.addItem')}</Button>
            </Link>
            <Link to="/outfits/new">
              <Button variant="secondary">{t('dashboard.createOutfit')}</Button>
            </Link>
          </>
        }
      />

      <Card className="mb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <BrandLogo />
          <div className="flex items-center gap-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 dark:bg-slate-800">
              <Shirt className="h-3.5 w-3.5" /> {t('dashboard.brandTag.catalog')}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 dark:bg-slate-800">
              <WashingMachine className="h-3.5 w-3.5" /> {t('dashboard.brandTag.laundry')}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 dark:bg-slate-800">
              <Sparkles className="h-3.5 w-3.5" /> {t('dashboard.brandTag.styles')}
            </span>
          </div>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {byStatus.map((row) => (
          <Card key={row.status}>
            <div className="flex items-center justify-between">
              <CardDescription>{getLocalizedStatusLabel(row.status, t)}</CardDescription>
              <StatusPanelIcon status={row.status} />
            </div>
            <CardTitle className="mt-2 text-2xl">{row.count}</CardTitle>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-3 lg:grid-cols-2">
        <Card>
          <CardDescription>{t('dashboard.catalogSize')}</CardDescription>
          <CardTitle className="mt-2 text-2xl">
            {t('dashboard.itemsCount', { count: items.length })}
          </CardTitle>
          <Link to="/items" className="mt-4 inline-block">
            <Button variant="outline">{t('dashboard.viewItems')}</Button>
          </Link>
        </Card>
        <Card>
          <CardDescription>{t('dashboard.favoriteOutfits')}</CardDescription>
          <CardTitle className="mt-2 text-2xl">{favoriteOutfits}</CardTitle>
          <Link to="/outfits" className="mt-4 inline-block">
            <Button variant="outline">{t('dashboard.manageOutfits')}</Button>
          </Link>
        </Card>
      </div>
    </section>
  )
}
