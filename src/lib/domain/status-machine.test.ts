import { describe, expect, it, vi } from 'vitest'
import { ClothingStatusMachine } from '@/lib/domain/statusMachine'

describe('ClothingStatusMachine', () => {
  it('allows only next-step transitions for cycle mode', () => {
    const machine = new ClothingStatusMachine(
      {
        getById: vi.fn(),
        setStatus: vi.fn(),
      } as never,
      { appendLog: vi.fn() } as never,
    )

    expect(machine.canTransition('clean', 'dirty')).toBe(true)
    expect(machine.canTransition('drying', 'clean')).toBe(true)
    expect(machine.canTransition('clean', 'washing')).toBe(false)
  })

  it('returns the next suggested status in lifecycle order', () => {
    const machine = new ClothingStatusMachine(
      {
        getById: vi.fn(),
        setStatus: vi.fn(),
      } as never,
      { appendLog: vi.fn() } as never,
    )

    expect(machine.nextSuggestedStatus('clean')).toBe('dirty')
    expect(machine.nextSuggestedStatus('dirty')).toBe('washing')
    expect(machine.nextSuggestedStatus('washing')).toBe('drying')
    expect(machine.nextSuggestedStatus('drying')).toBe('clean')
  })

  it('logs and applies manual override transitions', async () => {
    const getById = vi.fn().mockResolvedValue({
      id: 'item-1',
      status: 'clean',
    })
    const setStatus = vi.fn().mockResolvedValue({
      id: 'item-1',
      status: 'drying',
    })
    const appendLog = vi.fn().mockResolvedValue({})

    const machine = new ClothingStatusMachine(
      {
        getById,
        setStatus,
      } as never,
      { appendLog } as never,
    )

    const result = await machine.transition('item-1', 'drying', 'manual')

    expect(result.status).toBe('drying')
    expect(setStatus).toHaveBeenCalledWith('item-1', 'drying')
    expect(appendLog).toHaveBeenCalledWith({
      itemId: 'item-1',
      fromStatus: 'clean',
      toStatus: 'drying',
      reason: 'manual',
    })
  })

  it('rejects invalid cycle transitions', async () => {
    const machine = new ClothingStatusMachine(
      {
        getById: vi.fn().mockResolvedValue({
          id: 'item-1',
          status: 'clean',
        }),
        setStatus: vi.fn(),
      } as never,
      { appendLog: vi.fn() } as never,
    )

    await expect(machine.transition('item-1', 'washing', 'cycle')).rejects.toThrow(
      'Invalid cycle transition requested.',
    )
  })
})

