import { useEffect, useMemo } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import type { ClothingItem, Outfit } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { StatusBadge } from '@/components/status-badge'

interface OutfitFormValues {
  name: string
  occasion: string
  notes: string
  isFavorite: boolean
  itemIds: string[]
}

const outfitFormSchema = z.object({
  name: z.string().trim().min(2).max(80),
  occasion: z.string().trim().max(80),
  notes: z.string().trim().max(500),
  isFavorite: z.boolean(),
  itemIds: z.array(z.string().uuid()).min(1),
})

interface OutfitFormProps {
  items: ClothingItem[]
  initialOutfit?: Outfit
  submitLabel: string
  onSubmit: (values: OutfitFormValues) => Promise<void>
}

export function OutfitForm({ items, initialOutfit, submitLabel, onSubmit }: OutfitFormProps) {
  const form = useForm<OutfitFormValues>({
    resolver: zodResolver(outfitFormSchema),
    defaultValues: {
      name: initialOutfit?.name ?? '',
      occasion: initialOutfit?.occasion ?? '',
      notes: initialOutfit?.notes ?? '',
      isFavorite: initialOutfit?.isFavorite ?? false,
      itemIds: initialOutfit?.itemIds ?? [],
    },
  })

  useEffect(() => {
    form.reset({
      name: initialOutfit?.name ?? '',
      occasion: initialOutfit?.occasion ?? '',
      notes: initialOutfit?.notes ?? '',
      isFavorite: initialOutfit?.isFavorite ?? false,
      itemIds: initialOutfit?.itemIds ?? [],
    })
  }, [form, initialOutfit])

  const watchedItemIds = useWatch({
    control: form.control,
    name: 'itemIds',
  })
  const selectedItemIds = useMemo(() => watchedItemIds ?? [], [watchedItemIds])
  const selectedItems = useMemo(
    () => items.filter((item) => selectedItemIds.includes(item.id)),
    [items, selectedItemIds],
  )

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="outfit-name">Outfit name</Label>
          <Input id="outfit-name" placeholder="Example: Weekend Casual" {...form.register('name')} />
          {form.formState.errors.name ? (
            <p className="mt-1 text-xs text-rose-700">{form.formState.errors.name.message}</p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="outfit-occasion">Occasion</Label>
          <Input id="outfit-occasion" placeholder="Office, gym, travel..." {...form.register('occasion')} />
        </div>
        <div className="flex items-end gap-2">
          <Checkbox id="outfit-favorite" {...form.register('isFavorite')} />
          <Label htmlFor="outfit-favorite">Mark as favorite style</Label>
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="outfit-notes">Notes</Label>
          <Textarea id="outfit-notes" {...form.register('notes')} />
        </div>
      </div>

      <div>
        <CardTitle className="mb-2">Pick clothing items</CardTitle>
        <div className="grid gap-2 sm:grid-cols-2">
          {items.map((item) => (
            <label
              key={item.id}
              className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm"
            >
              <span className="truncate pr-3">
                <span className="font-medium">{item.name}</span>
                {item.brand ? <span className="ml-2 text-xs text-slate-500">{item.brand}</span> : null}
              </span>
              <span className="flex items-center gap-2">
                <StatusBadge status={item.status} />
                <Checkbox
                  checked={selectedItemIds.includes(item.id)}
                  onChange={(event) => {
                    const existing = form.getValues('itemIds')
                    form.setValue(
                      'itemIds',
                      event.target.checked
                        ? [...new Set([...existing, item.id])]
                        : existing.filter((value) => value !== item.id),
                    )
                  }}
                />
              </span>
            </label>
          ))}
        </div>
        {form.formState.errors.itemIds ? (
          <p className="mt-1 text-xs text-rose-700">{form.formState.errors.itemIds.message}</p>
        ) : null}
      </div>

      <Card>
        <CardTitle>Preview</CardTitle>
        {selectedItems.length === 0 ? (
          <CardDescription className="mt-1">Select at least one item.</CardDescription>
        ) : (
          <div className="mt-2 grid gap-2">
            {selectedItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2"
              >
                <span className="text-sm font-medium">{item.name}</span>
                <StatusBadge status={item.status} />
              </div>
            ))}
          </div>
        )}
      </Card>

      <Button type="submit" disabled={form.formState.isSubmitting}>
        {submitLabel}
      </Button>
    </form>
  )
}
