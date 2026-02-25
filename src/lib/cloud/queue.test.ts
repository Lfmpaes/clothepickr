import { ClothePickrDb } from '@/lib/db/schema'
import {
  enqueueSyncUpsert,
  enqueueSyncDelete,
  markQueueEntryRetry,
} from '@/lib/cloud/queue'

describe('sync queue', () => {
  let db: ClothePickrDb

  beforeEach(() => {
    db = new ClothePickrDb(`sync-queue-test-${crypto.randomUUID()}`)
  })

  afterEach(async () => {
    await db.delete()
  })

  it('collapses upsert then upsert to the latest upsert entry', async () => {
    await enqueueSyncUpsert(db, 'items', 'item-1', '2026-02-25T10:00:00.000Z')
    await enqueueSyncUpsert(db, 'items', 'item-1', '2026-02-25T10:05:00.000Z')

    const rows = await db.syncQueue.toArray()
    expect(rows).toHaveLength(1)
    expect(rows[0].op).toBe('upsert')
    expect(rows[0].changedAt).toBe('2026-02-25T10:05:00.000Z')
  })

  it('collapses upsert then delete to delete', async () => {
    await enqueueSyncUpsert(db, 'items', 'item-1', '2026-02-25T10:00:00.000Z')
    await enqueueSyncDelete(db, 'items', 'item-1', '2026-02-25T10:06:00.000Z')

    const rows = await db.syncQueue.toArray()
    expect(rows).toHaveLength(1)
    expect(rows[0].op).toBe('delete')
    expect(rows[0].changedAt).toBe('2026-02-25T10:06:00.000Z')
  })

  it('updates retry fields on queue entry', async () => {
    const entry = await enqueueSyncUpsert(db, 'outfits', 'outfit-1', '2026-02-25T10:00:00.000Z')
    await markQueueEntryRetry(
      db,
      entry.id,
      'Temporary network error',
      3,
      '2026-02-25T10:15:00.000Z',
    )

    const reloaded = await db.syncQueue.get(entry.id)
    expect(reloaded?.retryCount).toBe(3)
    expect(reloaded?.nextRetryAt).toBe('2026-02-25T10:15:00.000Z')
    expect(reloaded?.lastError).toBe('Temporary network error')
  })
})
