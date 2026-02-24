import { clothingItemCreateSchema, outfitCreateSchema } from '@/lib/validation/schemas'

describe('validation schemas', () => {
  it('accepts valid clothing item payloads', () => {
    const parsed = clothingItemCreateSchema.parse({
      name: 'Navy Chino',
      categoryId: crypto.randomUUID(),
      status: 'clean',
      seasonTags: ['spring'],
    })

    expect(parsed.name).toBe('Navy Chino')
    expect(parsed.status).toBe('clean')
  })

  it('rejects invalid clothing item payloads', () => {
    expect(() =>
      clothingItemCreateSchema.parse({
        name: 'x',
        categoryId: 'not-a-uuid',
      }),
    ).toThrow()
  })

  it('requires at least one item for an outfit', () => {
    expect(() =>
      outfitCreateSchema.parse({
        name: 'Office look',
        itemIds: [],
      }),
    ).toThrow()
  })
})
