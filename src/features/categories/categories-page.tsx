import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { categoryCreateSchema } from '@/lib/validation/schemas'
import { categoryRepository, itemRepository } from '@/lib/db'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface CategoryFormValues {
  name: string
}

export function CategoriesPage() {
  const categories = useLiveQuery(() => categoryRepository.list(true), [], [])
  const items = useLiveQuery(() => itemRepository.list(), [], [])
  const [error, setError] = useState<string>()
  const [editingId, setEditingId] = useState<string>()
  const [editingName, setEditingName] = useState('')

  const itemCountByCategory = useMemo(() => {
    return items.reduce<Record<string, number>>((acc, item) => {
      acc[item.categoryId] = (acc[item.categoryId] ?? 0) + 1
      return acc
    }, {})
  }, [items])

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryCreateSchema),
    defaultValues: { name: '' },
  })

  const handleCreate = form.handleSubmit(async (values) => {
    setError(undefined)
    try {
      await categoryRepository.create(values)
      form.reset()
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to create category.')
    }
  })

  const handleSaveEdit = async () => {
    if (!editingId) {
      return
    }

    setError(undefined)
    try {
      await categoryRepository.update(editingId, { name: editingName })
      setEditingId(undefined)
      setEditingName('')
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update category.')
    }
  }

  const handleToggleArchive = async (id: string, archived: boolean) => {
    setError(undefined)
    try {
      if (archived) {
        await categoryRepository.restore(id)
      } else {
        await categoryRepository.archive(id)
      }
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : 'Unable to update category.')
    }
  }

  return (
    <section>
      <PageHeader
        title="Categories"
        subtitle="Use defaults and custom categories to organize your wardrobe."
      />

      <Card className="mb-4">
        <CardTitle>Add category</CardTitle>
        <form className="mt-3 flex flex-col gap-3 sm:flex-row" onSubmit={handleCreate}>
          <div className="flex-1">
            <Label htmlFor="category-name">Name</Label>
            <Input id="category-name" placeholder="Example: Workwear" {...form.register('name')} />
            {form.formState.errors.name ? (
              <p className="mt-1 text-xs text-rose-700">{form.formState.errors.name.message}</p>
            ) : null}
          </div>
          <div className="flex items-end">
            <Button type="submit">Create</Button>
          </div>
        </form>
      </Card>

      {error ? (
        <p className="mb-3 rounded-md border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <div className="grid gap-3">
        {categories.map((category) => (
          <Card key={category.id}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                {editingId === category.id ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editingName}
                      onChange={(event) => setEditingName(event.target.value)}
                      className="w-52"
                    />
                    <Button size="sm" onClick={handleSaveEdit}>
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(undefined)
                        setEditingName('')
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <CardTitle>
                    {category.name}
                    {category.isDefault ? (
                      <span className="ml-2 text-xs font-medium text-emerald-700">Default</span>
                    ) : null}
                    {category.archived ? (
                      <span className="ml-2 text-xs font-medium text-slate-500">Archived</span>
                    ) : null}
                  </CardTitle>
                )}
                <CardDescription className="mt-1">
                  {itemCountByCategory[category.id] ?? 0} linked items
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingId(category.id)
                    setEditingName(category.name)
                  }}
                  disabled={editingId === category.id}
                >
                  Rename
                </Button>
                <Button
                  size="sm"
                  variant={category.archived ? 'secondary' : 'ghost'}
                  onClick={() => handleToggleArchive(category.id, category.archived)}
                >
                  {category.archived ? 'Restore' : 'Archive'}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  )
}

