import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { PhotoThumbnail } from '@/components/photo-thumbnail'
import { ItemForm } from '@/features/items/item-form'
import { STATUS_LABEL, STATUS_ORDER } from '@/lib/constants'
import { categoryRepository, itemRepository, laundryRepository, statusMachine } from '@/lib/db'
import { compressImage } from '@/lib/images/compress'
import type { ClothingStatus } from '@/lib/types'
import { formatDateTime } from '@/lib/utils'

export function ItemDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const categories = useLiveQuery(() => categoryRepository.list(), [], [])
  const item = useLiveQuery(() => (id ? itemRepository.getById(id) : undefined), [id])
  const logs = useLiveQuery(() => (id ? laundryRepository.listByItem(id) : []), [id], [])
  const [status, setStatus] = useState<ClothingStatus>('clean')
  const [error, setError] = useState<string>()

  if (!id) {
    return (
      <Card>
        <CardTitle>Invalid route</CardTitle>
      </Card>
    )
  }

  if (!item) {
    return (
      <Card>
        <CardTitle>Item not found</CardTitle>
        <Link to="/items" className="mt-3 inline-block">
          <Button variant="outline">Back to items</Button>
        </Link>
      </Card>
    )
  }

  const handleUpdate = async (
    values: {
      name: string
      categoryId: string
      status: 'clean' | 'dirty' | 'washing' | 'drying'
      color: string
      brand: string
      size: string
      notes: string
      seasonTags: string[]
    },
    files: File[],
  ) => {
    setError(undefined)
    try {
      await itemRepository.update(item.id, values)
      for (const file of files) {
        const compressed = await compressImage(file)
        await itemRepository.attachPhoto(item.id, compressed)
      }
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update item.')
    }
  }

  const handleDelete = async () => {
    const confirmed = window.confirm('Delete this item? This also removes linked logs and photos.')
    if (!confirmed) {
      return
    }
    await itemRepository.remove(item.id)
    navigate('/items')
  }

  const handleManualStatusChange = async () => {
    setError(undefined)
    try {
      await statusMachine.transition(item.id, status, 'manual')
    } catch (changeError) {
      setError(changeError instanceof Error ? changeError.message : 'Unable to update status.')
    }
  }

  const handleDetachPhoto = async (photoId: string) => {
    setError(undefined)
    try {
      await itemRepository.detachPhoto(item.id, photoId)
    } catch (detachError) {
      setError(detachError instanceof Error ? detachError.message : 'Unable to remove photo.')
    }
  }

  return (
    <section>
      <PageHeader title={item.name} subtitle="Edit details, status, and photos." />

      {error ? (
        <p className="mb-3 rounded-md border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <Card>
          <CardTitle>Edit item</CardTitle>
          <div className="mt-3">
            <ItemForm
              categories={categories}
              initialItem={item}
              submitLabel="Save changes"
              onSubmit={handleUpdate}
            />
          </div>
          <div className="mt-4">
            <Button variant="danger" onClick={handleDelete}>
              Delete item
            </Button>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardTitle>Manual status override</CardTitle>
            <CardDescription className="mt-1">
              Override lifecycle at any point from item details.
            </CardDescription>
            <div className="mt-3 space-y-2">
              <Label htmlFor="manual-status">Set status</Label>
              <Select
                id="manual-status"
                value={status}
                onChange={(event) => setStatus(event.target.value as ClothingStatus)}
              >
                {STATUS_ORDER.map((statusOption) => (
                  <option key={statusOption} value={statusOption}>
                    {STATUS_LABEL[statusOption]}
                  </option>
                ))}
              </Select>
              <Button className="w-full" onClick={handleManualStatusChange}>
                Update status
              </Button>
            </div>
          </Card>

          <Card>
            <CardTitle>Photos</CardTitle>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {item.photoIds.length === 0 ? (
                <CardDescription>No photos yet.</CardDescription>
              ) : (
                item.photoIds.map((photoId) => (
                  <div key={photoId}>
                    <PhotoThumbnail photoId={photoId} alt={item.name} className="h-24 w-full" />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-1 w-full"
                      onClick={() => handleDetachPhoto(photoId)}
                    >
                      Remove
                    </Button>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card>
            <CardTitle>Laundry timeline</CardTitle>
            <div className="mt-3 space-y-2">
              {logs.length === 0 ? (
                <CardDescription>No status changes logged yet.</CardDescription>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="rounded-md border border-slate-200 p-2 text-sm">
                    <p className="font-medium text-slate-800">
                      {STATUS_LABEL[log.fromStatus]} to {STATUS_LABEL[log.toStatus]}
                    </p>
                    <p className="text-xs text-slate-500">{formatDateTime(log.changedAt)}</p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </section>
  )
}
