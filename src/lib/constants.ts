import type { ClothingStatus } from '@/lib/types'

export interface DefaultCategoryDefinition {
  id: string
  name: string
}

export const DEFAULT_CATEGORY_DEFINITIONS: DefaultCategoryDefinition[] = [
  { id: 'fbd66f96-c9f7-4e02-8e0c-7f3446f20201', name: 'Shirts' },
  { id: '9c41d377-7f85-4d2c-8e80-28ad4a13ef02', name: 'Pants' },
  { id: '59ad3a73-3afe-49b0-80dd-d53f514b6703', name: 'Underwear' },
  { id: 'a16a5d63-0933-4ba6-8d13-4895fd0e3604', name: 'Socks' },
  { id: '073381d6-8c6f-49df-83d8-62f5cffad305', name: 'Outerwear' },
  { id: 'd165f53a-6dd8-452f-89f3-c4c77bf2f406', name: 'Shoes' },
  { id: 'c8af6b65-f252-484d-8e27-14de5ec0d807', name: 'Sportswear' },
  { id: 'e15cce69-be87-4f6b-86a1-a9a823733608', name: 'Accessories' },
]

export const DEFAULT_CATEGORIES = DEFAULT_CATEGORY_DEFINITIONS.map((category) => category.name)

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
