import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { useLocale } from '@/app/locale-context'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { outfitRepository, itemRepository } from '@/lib/db'

export function OutfitsPage() {
  const { t } = useLocale()
  const [favoriteOnly, setFavoriteOnly] = useState(false)
  const [error, setError] = useState<string>()

  const outfits = useLiveQuery(
    () => outfitRepository.list({ favoriteOnly }),
    [favoriteOnly],
    [],
  )
  const items = useLiveQuery(() => itemRepository.list(), [], [])

  const itemsById = useMemo(() => Object.fromEntries(items.map((item) => [item.id, item])), [items])

  const handleToggleFavorite = async (outfitId: string) => {
    setError(undefined)
    try {
      await outfitRepository.toggleFavorite(outfitId)
    } catch {
      setError(t('outfits.errorUpdate'))
    }
  }

  const handleDelete = async (outfitId: string) => {
    const confirmed = window.confirm(t('outfits.confirmDelete'))
    if (!confirmed) {
      return
    }

    setError(undefined)
    try {
      await outfitRepository.remove(outfitId)
    } catch {
      setError(t('outfits.errorDelete'))
    }
  }

  return (
    <section>
      <PageHeader
        title={t('outfits.title')}
        subtitle={t('outfits.subtitle')}
        actions={
          <Link to="/outfits/new">
            <Button>{t('outfits.create')}</Button>
          </Link>
        }
      />

      <div className="mb-4 flex items-center gap-2">
        <Checkbox
          id="favorite-outfits-filter"
          checked={favoriteOnly}
          onChange={(event) => setFavoriteOnly(event.target.checked)}
        />
        <Label htmlFor="favorite-outfits-filter">{t('outfits.onlyFavorites')}</Label>
      </div>

      {error ? (
        <p className="mb-3 rounded-md border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      {outfits.length === 0 ? (
        <Card>
          <CardTitle>{t('outfits.emptyTitle')}</CardTitle>
          <CardDescription className="mt-1">
            {t('outfits.emptyDescription')}
          </CardDescription>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {outfits.map((outfit) => {
            const resolvedItems = outfit.itemIds
              .map((itemId) => itemsById[itemId])
              .filter((item) => Boolean(item))
            const hasNonCleanItem = resolvedItems.some((item) => item.status !== 'clean')

            return (
              <Card key={outfit.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{outfit.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {outfit.occasion || t('outfits.noOccasion')} -{' '}
                      {t('outfits.pieces', { count: resolvedItems.length })}
                    </CardDescription>
                  </div>
                  {outfit.isFavorite ? (
                    <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
                      {t('outfits.favoriteBadge')}
                    </span>
                  ) : null}
                </div>

                {hasNonCleanItem ? (
                  <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                    {t('outfits.warningNotClean')}
                  </p>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-1">
                  {resolvedItems.map((item) => (
                    <span
                      key={item.id}
                      className="rounded-full border border-slate-200 px-2 py-1 text-xs text-slate-700"
                    >
                      {item.name}
                    </span>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleFavorite(outfit.id)}
                  >
                    {outfit.isFavorite ? t('outfits.unfavorite') : t('outfits.favorite')}
                  </Button>
                  <Link to={`/outfits/${outfit.id}`}>
                    <Button size="sm" variant="ghost">
                      {t('outfits.edit')}
                    </Button>
                  </Link>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(outfit.id)}>
                    {t('outfits.delete')}
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </section>
  )
}
