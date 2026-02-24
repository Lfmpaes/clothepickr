import { resetDatabase } from '@/lib/db'
import {
  enqueueSyncOperation,
  getPendingQueueCount,
  listPendingQueueEntries,
  markSyncQueueEntryFailure,
  removeSyncQueueEntry,
} from '@/lib/cloud/queue'

describe('sync queue', () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it('dedupes repeated upsert operations per entity', async () => {
    await enqueueSyncOperation('categories', 'category-1', 'upsert')
    await enqueueSyncOperation('categories', 'category-1', 'upsert')

    const pending = await listPendingQueueEntries(10)

    expect(pending).toHaveLength(1)
    expect(pending[0].table).toBe('categories')
    expect(pending[0].entityId).toBe('category-1')
    expect(pending[0].op).toBe('upsert')
  })

  it('collapses upsert then delete into a delete', async () => {
    await enqueueSyncOperation('items', 'item-1', 'upsert')
    await enqueueSyncOperation('items', 'item-1', 'delete')

    const pending = await listPendingQueueEntries(10)

    expect(pending).toHaveLength(1)
    expect(pending[0].op).toBe('delete')
  })

  it('increments retry metadata on failure', async () => {
    const entry = await enqueueSyncOperation('outfits', 'outfit-1', 'upsert')
    await markSyncQueueEntryFailure(entry.id, 'boom')

    const pending = await listPendingQueueEntries(10)

    expect(pending).toHaveLength(0)
    expect(await getPendingQueueCount()).toBe(1)

    await removeSyncQueueEntry(entry.id)
    expect(await getPendingQueueCount()).toBe(0)
  })
})
