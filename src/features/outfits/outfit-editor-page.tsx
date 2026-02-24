import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { OutfitForm } from '@/features/outfits/outfit-form'
import { itemRepository, outfitRepository } from '@/lib/db'

export function OutfitEditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [error, setError] = useState<string>()
  const items = useLiveQuery(() => itemRepository.list(), [], [])
  const outfit = useLiveQuery(() => (id ? outfitRepository.getById(id) : undefined), [id])

  const isEdit = Boolean(id)

  if (isEdit && !outfit) {
    return (
      <Card>
        <CardTitle>Outfit not found</CardTitle>
        <Link to="/outfits" className="mt-3 inline-block">
          <Button variant="outline">Back to outfits</Button>
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
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to save outfit.')
    }
  }

  return (
    <section>
      <PageHeader
        title={isEdit ? 'Edit Outfit' : 'Create Outfit'}
        subtitle="Select clothing from any categories and save the combination."
      />

      <Card>
        {error ? (
          <p className="mb-3 rounded-md border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700">
            {error}
          </p>
        ) : null}

        {items.length === 0 ? (
          <CardDescription>You need at least one clothing item to create an outfit.</CardDescription>
        ) : (
          <OutfitForm
            items={items}
            initialOutfit={outfit}
            submitLabel={isEdit ? 'Save outfit' : 'Create outfit'}
            onSubmit={handleSubmit}
          />
        )}
      </Card>
    </section>
  )
}

