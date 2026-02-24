import type { ClothingStatus, LaundryLog } from '@/lib/types'
import type { TranslationKey } from '@/lib/i18n/translations'
import {
  ITEM_COLOR_HEX_BY_VALUE,
  ITEM_COLOR_LABEL_KEY_BY_VALUE,
  isItemColorValue,
} from '@/lib/colors'

type TranslateFn = (key: TranslationKey, params?: Record<string, string | number>) => string

const statusKeyByValue: Record<ClothingStatus, TranslationKey> = {
  clean: 'status.clean',
  dirty: 'status.dirty',
  washing: 'status.washing',
  drying: 'status.drying',
}

const reasonKeyByValue: Record<LaundryLog['reason'], TranslationKey> = {
  manual: 'laundry.reason.manual',
  cycle: 'laundry.reason.cycle',
}

const defaultCategoryKeyByName: Record<string, TranslationKey> = {
  shirts: 'category.default.shirts',
  pants: 'category.default.pants',
  underwear: 'category.default.underwear',
  socks: 'category.default.socks',
  outerwear: 'category.default.outerwear',
  shoes: 'category.default.shoes',
  sportswear: 'category.default.sportswear',
  accessories: 'category.default.accessories',
}

export function getLocalizedStatusLabel(status: ClothingStatus, t: TranslateFn) {
  return t(statusKeyByValue[status])
}

export function getLocalizedReasonLabel(reason: LaundryLog['reason'], t: TranslateFn) {
  return t(reasonKeyByValue[reason])
}

export function getLocalizedCategoryName(name: string, t: TranslateFn) {
  const normalized = name.trim().toLowerCase()
  const key = defaultCategoryKeyByName[normalized]
  if (!key) {
    return name
  }

  return t(key)
}

export function getLocalizedColorLabel(color: string, t: TranslateFn) {
  if (!color) {
    return t('color.none')
  }
  if (isItemColorValue(color)) {
    return t(ITEM_COLOR_LABEL_KEY_BY_VALUE[color])
  }

  return color
}

export function getColorHex(color: string) {
  if (!isItemColorValue(color)) {
    return undefined
  }
  return ITEM_COLOR_HEX_BY_VALUE[color]
}
