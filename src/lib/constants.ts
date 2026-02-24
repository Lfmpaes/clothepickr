import type { ClothingStatus } from '@/lib/types'

export const DEFAULT_CATEGORIES = [
  'Shirts',
  'Pants',
  'Underwear',
  'Socks',
  'Outerwear',
  'Shoes',
  'Sportswear',
  'Accessories',
]

export const STATUS_ORDER: ClothingStatus[] = [
  'clean',
  'dirty',
  'washing',
  'drying',
]

export const STATUS_LABEL: Record<ClothingStatus, string> = {
  clean: 'Clean',
  dirty: 'Dirty',
  washing: 'Washing',
  drying: 'Drying',
}

export const STATUS_BADGE_CLASS: Record<ClothingStatus, string> = {
  clean: 'bg-emerald-100 text-emerald-900',
  dirty: 'bg-amber-100 text-amber-900',
  washing: 'bg-sky-100 text-sky-900',
  drying: 'bg-indigo-100 text-indigo-900',
}

