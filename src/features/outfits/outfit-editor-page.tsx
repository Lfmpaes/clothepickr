import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLocale } from '@/app/locale-context'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { OutfitForm } from '@/features/outfits/outfit-form'
import { itemRepository, outfitRepository } from '@/lib/db'

export function OutfitEditorPage() {
  const { t } = useLocale()
  const { id } = useParams()
  const navigate = useNavigate()
  const [error, setError] = useState<string>()
  const items = useLiveQuery(() => itemRepository.list(), [], [])
  const outfit = useLiveQuery(() => (id ? outfitRepository.getById(id) : undefined), [id])

  const isEdit = Boolean(id)

  if (isEdit && !outfit) {
    return (
      <Card>
        <CardTitle>{t('outfitEditor.notFound')}</CardTitle>
        <Link to="/outfits" className="mt-3 inline-block">
          <Button variant="outline">{t('outfitEditor.backToOutfits')}</Button>
        </Link>
      </Card>
    )
  }

  const handleSubmit = async (values: {
    name: string
    occasion: string
    notes: string
    isFavorite: boolean
    itemIds: string[]
  }) => {
    setError(undefined)
    try {
      if (id) {
        await outfitRepository.update(id, values)
      } else {
        await outfitRepository.create(values)
      }
      navigate('/outfits')
    } catch {
      setError(t('outfitEditor.errorSave'))
    }
  }

  return (
    <section>
      <PageHeader
        title={isEdit ? t('outfitEditor.titleEdit') : t('outfitEditor.titleCreate')}
        subtitle={t('outfitEditor.subtitle')}
      />

      <Card>
        {error ? (
          <p className="mb-3 rounded-md border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700">
            {error}
          </p>
        ) : null}

        {items.length === 0 ? (
          <CardDescription>{t('outfitEditor.noItems')}</CardDescription>
        ) : (
          <OutfitForm
            items={items}
            initialOutfit={outfit}
            submitLabel={isEdit ? t('outfitEditor.save') : t('outfitEditor.create')}
            onSubmit={handleSubmit}
          />
        )}
      </Card>
    </section>
  )
}
