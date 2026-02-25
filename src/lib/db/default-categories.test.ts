import { DEFAULT_CATEGORY_DEFINITIONS } from '@/lib/constants'
import type { ClothePickrDb } from '@/lib/db/schema'

interface DbModuleContext {
  db: ClothePickrDb
  initializeDatabase: () => Promise<void>
}

async function loadDbModuleContext(): Promise<DbModuleContext> {
  vi.resetModules()
  const module = await import('@/lib/db')
  await module.db.delete()
  await module.db.open()

  return {
    db: module.db,
    initializeDatabase: module.initializeDatabase,
  }
}

describe('default category initialization', () => {
  let context: DbModuleContext | undefined

  afterEach(async () => {
    if (!context) {
      return
    }
    await context.db.delete()
    context = undefined
  })

  it('seeds all default categories using stable ids', async () => {
    context = await loadDbModuleContext()
    await context.initializeDatabase()

    const categories = await context.db.categories.toArray()

    expect(categories.filter((category) => category.isDefault)).toHaveLength(
      DEFAULT_CATEGORY_DEFINITIONS.length,
    )

    for (const definition of DEFAULT_CATEGORY_DEFINITIONS) {
      expect(
        categories.find((category) => category.id === definition.id && category.name === definition.name),
      ).toBeDefined()
    }
  })

  it('deduplicates default categories and remaps linked items', async () => {
    context = await loadDbModuleContext()
    const now = new Date().toISOString()
    const duplicateShirtCategoryA = crypto.randomUUID()
    const duplicateShirtCategoryB = crypto.randomUUID()
    const linkedItemId = crypto.randomUUID()
    const shirtsDefinition = DEFAULT_CATEGORY_DEFINITIONS.find(
      (category) => category.name === 'Shirts',
    )

    if (!shirtsDefinition) {
      throw new Error('Missing Shirts default category definition.')
    }

    await context.db.categories.bulkAdd([
      {
        id: duplicateShirtCategoryA,
        name: shirtsDefinition.name,
        isDefault: true,
        archived: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: duplicateShirtCategoryB,
        name: shirtsDefinition.name,
        isDefault: true,
        archived: false,
        createdAt: now,
        updatedAt: now,
      },
    ])

    await context.db.items.add({
      id: linkedItemId,
      name: 'Blue Tee',
      categoryId: duplicateShirtCategoryB,
      status: 'clean',
      color: '',
      brand: '',
      size: '',
      notes: '',
      seasonTags: [],
      photoIds: [],
      createdAt: now,
      updatedAt: now,
    })

    await context.initializeDatabase()

    const shirtDefaults = (await context.db.categories.toArray()).filter(
      (category) => category.isDefault && category.name === shirtsDefinition.name,
    )
    const linkedItem = await context.db.items.get(linkedItemId)

    expect(shirtDefaults).toHaveLength(1)
    expect(shirtDefaults[0].id).toBe(shirtsDefinition.id)
    expect(linkedItem?.categoryId).toBe(shirtsDefinition.id)
    expect(await context.db.categories.get(duplicateShirtCategoryA)).toBeUndefined()
    expect(await context.db.categories.get(duplicateShirtCategoryB)).toBeUndefined()
  })
})
