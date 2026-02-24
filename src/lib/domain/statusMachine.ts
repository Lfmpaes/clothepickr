import { STATUS_ORDER } from '@/lib/constants'
import type {
  ClothingItem,
  ClothingStatus,
  LaundryLog,
} from '@/lib/types'
import type { ItemRepository, LaundryRepository } from '@/lib/db/repositories'

export interface StatusMachine {
  canTransition(from: ClothingStatus, to: ClothingStatus): boolean
  nextSuggestedStatus(current: ClothingStatus): ClothingStatus
  transition(
    itemId: string,
    toStatus: ClothingStatus,
    reason?: LaundryLog['reason'],
  ): Promise<ClothingItem>
}

export class ClothingStatusMachine implements StatusMachine {
  private readonly itemRepository: ItemRepository
  private readonly laundryRepository: LaundryRepository

  constructor(itemRepository: ItemRepository, laundryRepository: LaundryRepository) {
    this.itemRepository = itemRepository
    this.laundryRepository = laundryRepository
  }

  canTransition(from: ClothingStatus, to: ClothingStatus) {
    if (from === to) {
      return true
    }

    const currentIndex = STATUS_ORDER.indexOf(from)
    return STATUS_ORDER[(currentIndex + 1) % STATUS_ORDER.length] === to
  }

  nextSuggestedStatus(current: ClothingStatus) {
    const currentIndex = STATUS_ORDER.indexOf(current)
    return STATUS_ORDER[(currentIndex + 1) % STATUS_ORDER.length]
  }

  async transition(
    itemId: string,
    toStatus: ClothingStatus,
    reason: LaundryLog['reason'] = 'manual',
  ) {
    const current = await this.itemRepository.getById(itemId)
    if (!current) {
      throw new Error('Item not found.')
    }

    if (reason === 'cycle' && !this.canTransition(current.status, toStatus)) {
      throw new Error('Invalid cycle transition requested.')
    }

    const updated = await this.itemRepository.setStatus(itemId, toStatus)
    await this.laundryRepository.appendLog({
      itemId: itemId,
      fromStatus: current.status,
      toStatus,
      reason,
    })

    return updated
  }
}
