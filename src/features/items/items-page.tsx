import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { ColorSwatch } from '@/components/color-swatch'
import { CategoryPanelIcon } from '@/components/category-panel-icon'
import { PhotoThumbnail } from '@/components/photo-thumbnail'
import { StatusBadge } from '@/components/status-badge'
import { useLocale } from '@/app/locale-context'
import { ITEM_COLOR_VALUES, type ItemColorValue } from '@/lib/colors'
import { STATUS_ORDER } from '@/lib/constants'
import { categoryRepository, itemRepository, statusMachine } from '@/lib/db'
import {
  getColorHex,
  getLocalizedCategoryName,
  getLocalizedColorLabel,
  getLocalizedStatusLabel,
} from '@/lib/i18n/helpers'
import type { ClothingStatus } from '@/lib/types'

export function ItemsPage() {
  const { t } = useLocale()
  const categories = useLiveQuery(() => categoryRepository.list(), [], [])
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('all')
  const [status, setStatus] = useState<'all' | ClothingStatus>('all')
  const [color, setColor] = useState<'all' | ItemColorValue>('all')
  const [favoriteOnly, setFavoriteOnly] = useState(false)
  const [error, setError] = useState<string>()

  const items = useLiveQuery(
    () =>
      itemRepository.list({
        search,
        categoryId: categoryId === 'all' ? undefined : categoryId,
        status: status === 'all' ? undefined : status,
        color: color === 'all' ? undefined : color,
        favoriteOnly,
      }),
    [search, categoryId, status, color, favoriteOnly],
    [],
  )

  const categoryNameById = useMemo(
    () => Object.fromEntries(categories.map((category) => [category.id, category.name])),
    [categories],
  )
  const categoryLabelById = useMemo(
    () =>
      Object.fromEntries(
        categories.map((category) => [category.id, getLocalizedCategoryName(category.name, t)]),
      ),
    [categories, t],
  )

  const handleQuickCycle = async (itemId: string, currentStatus: ClothingStatus) => {
    setError(undefined)
    try {
      await statusMachine.transition(itemId, statusMachine.nextSuggestedStatus(currentStatus), 'cycle')
    } catch {
      setError(t('items.errorTransition'))
    }
  }

  return (
    <section>
      <PageHeader
        title={t('items.title')}
        subtitle={t('items.subtitle')}
        actions={
          <Link to="/items/new">
            <Button>{t('items.add')}</Button>
          </Link>
        }
      />

      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <Label htmlFor="item-search">{t('items.searchLabel')}</Label>
            <Input
              id="item-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('items.searchPlaceholder')}
            />
          </div>
          <div>
            <Label htmlFor="item-category-filter">{t('items.categoryLabel')}</Label>
            <Select
              id="item-category-filter"
              value={categoryId}
              onValueChange={setCategoryId}
              options={[
                { value: 'all', label: t('items.allCategories') },
                ...categories.map((category) => ({
                  value: category.id,
                  label: getLocalizedCategoryName(category.name, t),
                })),
              ]}
            />
          </div>
          <div>
            <Label htmlFor="item-status-filter">{t('items.statusLabel')}</Label>
            <Select
              id="item-status-filter"
              value={status}
              onValueChange={(value) => setStatus(value as 'all' | ClothingStatus)}
              options={[
                { value: 'all', label: t('items.allStatuses') },
                ...STATUS_ORDER.map((value) => ({
                  value,
                  label: getLocalizedStatusLabel(value, t),
                })),
              ]}
            />
          </div>
          <div>
            <Label htmlFor="item-color-filter">{t('items.colorLabel')}</Label>
            <Select
              id="item-color-filter"
              value={color}
              onValueChange={(value) => setColor(value as 'all' | ItemColorValue)}
              options={[
                { value: 'all', label: t('items.allColors'), icon: <ColorSwatch rainbow /> },
                ...ITEM_COLOR_VALUES.map((value) => ({
                  value,
                  label: getLocalizedColorLabel(value, t),
                  icon: value ? <ColorSwatch color={getColorHex(value)} /> : undefined,
                })),
              ]}
            />
          </div>
          <div className="flex flex-col">
            <span className="invisible text-sm font-medium select-none">{t('items.colorLabel')}</span>
            <div className="flex h-10 items-center gap-2">
              <Checkbox
                id="item-favorites-filter"
                checked={favoriteOnly}
                onChange={(event) => setFavoriteOnly(event.target.checked)}
              />
              <Label htmlFor="item-favorites-filter" className="leading-tight">
                {t('items.favoriteFilter')}
              </Label>
            </div>
          </div>
        </div>
      </Card>

      {error ? (
        <p className="mb-3 rounded-md border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      {items.length === 0 ? (
        <Card>
          <CardTitle>{t('items.noMatchTitle')}</CardTitle>
          <CardDescription className="mt-1">
            {t('items.noMatchDescription')}
          </CardDescription>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((item) => (
            <Card key={item.id}>
              <div className="flex gap-3">
                {item.photoIds[0] ? (
                  <PhotoThumbnail photoId={item.photoIds[0]} alt={item.name} className="h-20 w-20" />
                ) : null}
                <div className="min-w-0 flex-1">
                  <CardTitle className="truncate">{item.name}</CardTitle>
                  <CardDescription className="mt-1 inline-flex items-center gap-1">
                    <CategoryPanelIcon
                      categoryName={categoryNameById[item.categoryId] ?? t('category.unknown')}
                    />
                    {categoryLabelById[item.categoryId] ?? t('category.unknown')}
                  </CardDescription>
                  <div className="mt-2 flex items-center gap-2">
                    <StatusBadge status={item.status} />
                    {item.color ? (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                        <span
                          className="h-2.5 w-2.5 rounded-full border border-slate-300"
                          style={{ backgroundColor: getColorHex(item.color) ?? '#CBD5E1' }}
                        />
                        {getLocalizedColorLabel(item.color, t)}
                      </span>
                    ) : null}
                    {item.brand ? <span className="text-xs text-slate-500">{item.brand}</span> : null}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleQuickCycle(item.id, item.status)}
                >
                  {t('items.moveTo', {
                    status: getLocalizedStatusLabel(statusMachine.nextSuggestedStatus(item.status), t),
                  })}
                </Button>
                <Link to={`/items/${item.id}`}>
                  <Button size="sm" variant="ghost">
                    {t('items.open')}
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  )
}
