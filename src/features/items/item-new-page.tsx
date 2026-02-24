import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { useLocale } from '@/app/locale-context'
import { categoryRepository, itemRepository } from '@/lib/db'
import { compressImage } from '@/lib/images/compress'
import { PageHeader } from '@/components/page-header'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { ItemForm } from '@/features/items/item-form'

export function ItemNewPage() {
  const { t } = useLocale()
  const navigate = useNavigate()
  const categories = useLiveQuery(() => categoryRepository.list(), [], [])
  const [error, setError] = useState<string>()

  const handleCreate = async (
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
      const item = await itemRepository.create(values)
      for (const file of files) {
        const compressed = await compressImage(file)
        await itemRepository.attachPhoto(item.id, compressed)
      }
      navigate(`/items/${item.id}`)
    } catch {
      setError(t('itemNew.errorCreate'))
    }
  }

  return (
    <section>
      <PageHeader
        title={t('itemNew.title')}
        subtitle={t('itemNew.subtitle')}
      />

      {categories.length === 0 ? (
        <Card>
          <CardTitle>{t('itemNew.noCategoriesTitle')}</CardTitle>
          <CardDescription className="mt-1">
            {t('itemNew.noCategoriesDescription')}
          </CardDescription>
        </Card>
      ) : (
        <Card>
          {error ? (
            <p className="mb-3 rounded-md border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700">
              {error}
            </p>
          ) : null}
          <ItemForm categories={categories} submitLabel={t('itemNew.create')} onSubmit={handleCreate} />
        </Card>
      )}
    </section>
  )
}
