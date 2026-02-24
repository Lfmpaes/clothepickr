import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import type { Category, ClothingItem, ClothingStatus } from '@/lib/types'
import { STATUS_ORDER, STATUS_LABEL } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

const itemFormSchema = z.object({
  name: z.string().trim().min(2).max(80),
  categoryId: z.string().uuid(),
  status: z.enum(['clean', 'dirty', 'washing', 'drying']),
  color: z.string().trim().max(40),
  brand: z.string().trim().max(40),
  size: z.string().trim().max(20),
  notes: z.string().trim().max(500),
  seasonTags: z.string().max(200),
  _photos: z.instanceof(FileList).optional(),
})

interface ItemFormValues {
  name: string
  categoryId: string
  status: ClothingStatus
  color: string
  brand: string
  size: string
  notes: string
  seasonTags: string
  _photos?: FileList
}

interface ItemFormProps {
  categories: Category[]
  initialItem?: ClothingItem
  submitLabel: string
  onSubmit: (values: Omit<ItemFormValues, 'seasonTags'> & { seasonTags: string[] }, files: File[]) => Promise<void>
}

export function ItemForm({ categories, initialItem, submitLabel, onSubmit }: ItemFormProps) {
  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      name: initialItem?.name ?? '',
      categoryId: initialItem?.categoryId ?? categories[0]?.id ?? '',
      status: initialItem?.status ?? 'clean',
      color: initialItem?.color ?? '',
      brand: initialItem?.brand ?? '',
      size: initialItem?.size ?? '',
      notes: initialItem?.notes ?? '',
      seasonTags: initialItem?.seasonTags.join(', ') ?? '',
      _photos: undefined,
    },
  })

  useEffect(() => {
    form.reset({
      name: initialItem?.name ?? '',
      categoryId: initialItem?.categoryId ?? categories[0]?.id ?? '',
      status: initialItem?.status ?? 'clean',
      color: initialItem?.color ?? '',
      brand: initialItem?.brand ?? '',
      size: initialItem?.size ?? '',
      notes: initialItem?.notes ?? '',
      seasonTags: initialItem?.seasonTags.join(', ') ?? '',
      _photos: undefined,
    })
  }, [categories, form, initialItem])

  const handleSubmit = form.handleSubmit(async (values) => {
    const files = Array.from(values._photos ?? [])
    await onSubmit(
      {
        name: values.name,
        categoryId: values.categoryId,
        status: values.status,
        color: values.color,
        brand: values.brand,
        size: values.size,
        notes: values.notes,
        seasonTags: values.seasonTags
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
      },
      files,
    )
  })

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="item-name">Item name</Label>
          <Input id="item-name" placeholder="Example: White Oxford Shirt" {...form.register('name')} />
          {form.formState.errors.name ? (
            <p className="mt-1 text-xs text-rose-700">{form.formState.errors.name.message}</p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="item-category">Category</Label>
          <Select id="item-category" {...form.register('categoryId')}>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="item-status">Status</Label>
          <Select id="item-status" {...form.register('status')}>
            {STATUS_ORDER.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABEL[status]}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="item-color">Color</Label>
          <Input id="item-color" {...form.register('color')} />
        </div>
        <div>
          <Label htmlFor="item-brand">Brand</Label>
          <Input id="item-brand" {...form.register('brand')} />
        </div>
        <div>
          <Label htmlFor="item-size">Size</Label>
          <Input id="item-size" {...form.register('size')} />
        </div>
        <div>
          <Label htmlFor="item-tags">Season tags (comma separated)</Label>
          <Input id="item-tags" placeholder="summer, office" {...form.register('seasonTags')} />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="item-notes">Notes</Label>
          <Textarea id="item-notes" {...form.register('notes')} />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="item-photos">Upload photos (optional)</Label>
          <Input
            id="item-photos"
            type="file"
            accept="image/*"
            multiple
            {...form.register('_photos' as keyof ItemFormValues)}
          />
        </div>
      </div>

      <Button type="submit" disabled={form.formState.isSubmitting || categories.length === 0}>
        {submitLabel}
      </Button>
    </form>
  )
}
