import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useLocale } from '@/app/locale-context'
import { categoryCreateSchema } from '@/lib/validation/schemas'
import { categoryRepository, itemRepository } from '@/lib/db'
import { getLocalizedCategoryName } from '@/lib/i18n/helpers'
import { CategoryPanelIcon } from '@/components/category-panel-icon'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface CategoryFormValues {
  name: string
}

export function CategoriesPage() {
  const { t } = useLocale()
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
    } catch {
      setError(t('categories.errorCreate'))
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
    } catch {
      setError(t('categories.errorUpdate'))
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
    } catch {
      setError(t('categories.errorArchive'))
    }
  }

  return (
    <section>
      <PageHeader title={t('categories.title')} subtitle={t('categories.subtitle')} />

      <Card className="mb-4">
        <CardTitle>{t('categories.addTitle')}</CardTitle>
        <form className="mt-3 flex flex-col gap-3 sm:flex-row" onSubmit={handleCreate}>
          <div className="flex-1">
            <Label htmlFor="category-name">{t('categories.nameLabel')}</Label>
            <Input
              id="category-name"
              placeholder={t('categories.namePlaceholder')}
              {...form.register('name')}
            />
            {form.formState.errors.name ? (
              <p className="mt-1 text-xs text-rose-700">{form.formState.errors.name.message}</p>
            ) : null}
          </div>
          <div className="flex items-end">
            <Button type="submit">{t('categories.create')}</Button>
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
                      {t('categories.save')}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(undefined)
                        setEditingName('')
                      }}
                    >
                      {t('categories.cancel')}
                    </Button>
                  </div>
                ) : (
                  <CardTitle>
                    <span className="inline-flex items-center gap-2">
                      <CategoryPanelIcon categoryName={category.name} />
                      {getLocalizedCategoryName(category.name, t)}
                    </span>
                    {category.isDefault ? (
                      <span className="ml-2 text-xs font-medium text-emerald-700">
                        {t('category.default.badge')}
                      </span>
                    ) : null}
                    {category.archived ? (
                      <span className="ml-2 text-xs font-medium text-slate-500">
                        {t('category.archived.badge')}
                      </span>
                    ) : null}
                  </CardTitle>
                )}
                <CardDescription className="mt-1">
                  {t('categories.linkedItems', { count: itemCountByCategory[category.id] ?? 0 })}
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
                  {t('categories.rename')}
                </Button>
                <Button
                  size="sm"
                  variant={category.archived ? 'secondary' : 'ghost'}
                  onClick={() => handleToggleArchive(category.id, category.archived)}
                >
                  {category.archived ? t('categories.restore') : t('categories.archive')}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  )
}
