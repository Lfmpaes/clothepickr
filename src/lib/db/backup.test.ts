import {
  categoryRepository,
  createBackupSnapshot,
  itemRepository,
  resetDatabase,
  restoreBackupSnapshot,
} from '@/lib/db'

describe('database backup and restore', () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it('exports and restores local data', async () => {
    const category = await categoryRepository.create({ name: 'Formalwear' })
    await itemRepository.create({
      name: 'Navy Blazer',
      categoryId: category.id,
      status: 'clean',
      seasonTags: ['winter'],
    })

    const snapshot = await createBackupSnapshot()

    await resetDatabase()
    await restoreBackupSnapshot(snapshot)

    const itemsAfterRestore = await itemRepository.list({
      search: 'Navy Blazer',
    })

    expect(snapshot.schemaVersion).toBe(1)
    expect(itemsAfterRestore).toHaveLength(1)
    expect(itemsAfterRestore[0].name).toBe('Navy Blazer')
  })

  it('rejects invalid backup payloads', async () => {
    await expect(
      restoreBackupSnapshot({
        schemaVersion: 999,
        data: {},
      }),
    ).rejects.toThrow()
  })
})
