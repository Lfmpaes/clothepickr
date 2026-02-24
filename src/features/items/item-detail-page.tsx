import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLocale } from '@/app/locale-context'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { PhotoThumbnail } from '@/components/photo-thumbnail'
import { ItemForm } from '@/features/items/item-form'
import { STATUS_ORDER } from '@/lib/constants'
import { categoryRepository, itemRepository, laundryRepository, statusMachine } from '@/lib/db'
import { getLocalizedStatusLabel } from '@/lib/i18n/helpers'
import { compressImage } from '@/lib/images/compress'
import type { ClothingStatus } from '@/lib/types'
import { formatDateTime } from '@/lib/utils'

export function ItemDetailPage() {
  const { t } = useLocale()
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
        <CardTitle>{t('itemDetail.invalidRoute')}</CardTitle>
      </Card>
    )
  }

  if (!item) {
    return (
      <Card>
        <CardTitle>{t('itemDetail.notFound')}</CardTitle>
        <Link to="/items" className="mt-3 inline-block">
          <Button variant="outline">{t('itemDetail.backToItems')}</Button>
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
    } catch {
      setError(t('itemDetail.errorUpdate'))
    }
  }

  const handleDelete = async () => {
    const confirmed = window.confirm(t('itemDetail.confirmDelete'))
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
    } catch {
      setError(t('itemDetail.errorStatus'))
    }
  }

  const handleDetachPhoto = async (photoId: string) => {
    setError(undefined)
    try {
      await itemRepository.detachPhoto(item.id, photoId)
    } catch {
      setError(t('itemDetail.errorPhoto'))
    }
  }

  return (
    <section>
      <PageHeader title={item.name} subtitle={t('itemDetail.subtitle')} />

      {error ? (
        <p className="mb-3 rounded-md border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <Card>
          <CardTitle>{t('itemDetail.editTitle')}</CardTitle>
          <div className="mt-3">
            <ItemForm
              categories={categories}
              initialItem={item}
              submitLabel={t('itemDetail.save')}
              onSubmit={handleUpdate}
            />
          </div>
          <div className="mt-4">
            <Button variant="danger" onClick={handleDelete}>
              {t('itemDetail.delete')}
            </Button>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardTitle>{t('itemDetail.manualTitle')}</CardTitle>
            <CardDescription className="mt-1">
              {t('itemDetail.manualDescription')}
            </CardDescription>
            <div className="mt-3 space-y-2">
              <Label htmlFor="manual-status">{t('itemDetail.setStatus')}</Label>
              <Select
                id="manual-status"
                value={status}
                onValueChange={(value) => setStatus(value as ClothingStatus)}
                options={STATUS_ORDER.map((statusOption) => ({
                  value: statusOption,
                  label: getLocalizedStatusLabel(statusOption, t),
                }))}
              />
              <Button className="w-full" onClick={handleManualStatusChange}>
                {t('itemDetail.updateStatus')}
              </Button>
            </div>
          </Card>

          <Card>
            <CardTitle>{t('itemDetail.photosTitle')}</CardTitle>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {item.photoIds.length === 0 ? (
                <CardDescription>{t('itemDetail.noPhotos')}</CardDescription>
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
                      {t('itemDetail.removePhoto')}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card>
            <CardTitle>{t('itemDetail.timelineTitle')}</CardTitle>
            <div className="mt-3 space-y-2">
              {logs.length === 0 ? (
                <CardDescription>{t('itemDetail.noLogs')}</CardDescription>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="rounded-md border border-slate-200 p-2 text-sm">
                    <p className="font-medium text-slate-800">
                      {t('itemDetail.transition', {
                        from: getLocalizedStatusLabel(log.fromStatus, t),
                        to: getLocalizedStatusLabel(log.toStatus, t),
                      })}
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
