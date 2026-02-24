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
import { PhotoThumbnail } from '@/components/photo-thumbnail'
import { StatusBadge } from '@/components/status-badge'
import { STATUS_LABEL, STATUS_ORDER } from '@/lib/constants'
import { categoryRepository, itemRepository, statusMachine } from '@/lib/db'
import type { ClothingStatus } from '@/lib/types'

export function ItemsPage() {
  const categories = useLiveQuery(() => categoryRepository.list(), [], [])
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('all')
  const [status, setStatus] = useState<'all' | ClothingStatus>('all')
  const [favoriteOnly, setFavoriteOnly] = useState(false)
  const [error, setError] = useState<string>()

  const items = useLiveQuery(
    () =>
      itemRepository.list({
        search,
        categoryId: categoryId === 'all' ? undefined : categoryId,
        status: status === 'all' ? undefined : status,
        favoriteOnly,
      }),
    [search, categoryId, status, favoriteOnly],
    [],
  )

  const categoryNameById = useMemo(
    () => Object.fromEntries(categories.map((category) => [category.id, category.name])),
    [categories],
  )

  const handleQuickCycle = async (itemId: string, currentStatus: ClothingStatus) => {
    setError(undefined)
    try {
      await statusMachine.transition(itemId, statusMachine.nextSuggestedStatus(currentStatus), 'cycle')
    } catch (transitionError) {
      setError(
        transitionError instanceof Error
          ? transitionError.message
          : 'Could not update item status.',
      )
    }
  }

  return (
    <section>
      <PageHeader
        title="Clothing Items"
        subtitle="Filter your wardrobe and update laundry status with one tap."
        actions={
          <Link to="/items/new">
            <Button>Add item</Button>
          </Link>
        }
      />

      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label htmlFor="item-search">Search</Label>
            <Input
              id="item-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name, brand, notes..."
            />
          </div>
          <div>
            <Label htmlFor="item-category-filter">Category</Label>
            <Select
              id="item-category-filter"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
            >
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="item-status-filter">Status</Label>
            <Select
              id="item-status-filter"
              value={status}
              onChange={(event) => setStatus(event.target.value as 'all' | ClothingStatus)}
            >
              <option value="all">All statuses</option>
              {STATUS_ORDER.map((value) => (
                <option key={value} value={value}>
                  {STATUS_LABEL[value]}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <Checkbox
              id="item-favorites-filter"
              checked={favoriteOnly}
              onChange={(event) => setFavoriteOnly(event.target.checked)}
            />
            <Label htmlFor="item-favorites-filter">Only items in favorite outfits</Label>
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
          <CardTitle>No items match your filters.</CardTitle>
          <CardDescription className="mt-1">
            Add items or change the current filters.
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
                  <CardDescription className="mt-1">
                    {categoryNameById[item.categoryId] ?? 'Unknown category'}
                  </CardDescription>
                  <div className="mt-2 flex items-center gap-2">
                    <StatusBadge status={item.status} />
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
                  Move to {STATUS_LABEL[statusMachine.nextSuggestedStatus(item.status)]}
                </Button>
                <Link to={`/items/${item.id}`}>
                  <Button size="sm" variant="ghost">
                    Open
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

