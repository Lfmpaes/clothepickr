import type { TranslationKey } from '@/lib/i18n/translations'

export const ITEM_COLOR_VALUES = [
  '',
  'black',
  'white',
  'gray',
  'charcoal',
  'navy',
  'blue',
  'sky',
  'teal',
  'green',
  'olive',
  'lime',
  'yellow',
  'gold',
  'orange',
  'coral',
  'red',
  'burgundy',
  'pink',
  'purple',
  'lavender',
  'brown',
  'beige',
  'cream',
] as const

export type ItemColorValue = (typeof ITEM_COLOR_VALUES)[number]

export const ITEM_COLOR_HEX_BY_VALUE: Record<ItemColorValue, string> = {
  '': '#CBD5E1',
  black: '#111827',
  white: '#FFFFFF',
  gray: '#6B7280',
  charcoal: '#374151',
  navy: '#1E3A8A',
  blue: '#2563EB',
  sky: '#0EA5E9',
  teal: '#0F766E',
  green: '#16A34A',
  olive: '#4D7C0F',
  lime: '#84CC16',
  yellow: '#FACC15',
  gold: '#CA8A04',
  orange: '#EA580C',
  coral: '#F97316',
  red: '#DC2626',
  burgundy: '#7F1D1D',
  pink: '#EC4899',
  purple: '#9333EA',
  lavender: '#A78BFA',
  brown: '#8B5A2B',
  beige: '#D6BC8A',
  cream: '#FFF7D6',
}

export const ITEM_COLOR_LABEL_KEY_BY_VALUE: Record<ItemColorValue, TranslationKey> = {
  '': 'color.none',
  black: 'color.black',
  white: 'color.white',
  gray: 'color.gray',
  charcoal: 'color.charcoal',
  navy: 'color.navy',
  blue: 'color.blue',
  sky: 'color.sky',
  teal: 'color.teal',
  green: 'color.green',
  olive: 'color.olive',
  lime: 'color.lime',
  yellow: 'color.yellow',
  gold: 'color.gold',
  orange: 'color.orange',
  coral: 'color.coral',
  red: 'color.red',
  burgundy: 'color.burgundy',
  pink: 'color.pink',
  purple: 'color.purple',
  lavender: 'color.lavender',
  brown: 'color.brown',
  beige: 'color.beige',
  cream: 'color.cream',
}

export const ITEM_COLOR_SWATCH_BY_VALUE: Record<ItemColorValue, string> = {
  '': '◻',
  black: '⬛',
  white: '⬜',
  gray: '◼',
  charcoal: '◾',
  navy: '🟦',
  blue: '🟦',
  sky: '🟦',
  teal: '🟩',
  green: '🟩',
  olive: '🟩',
  lime: '🟩',
  yellow: '🟨',
  gold: '🟨',
  orange: '🟧',
  coral: '🟧',
  red: '🟥',
  burgundy: '🟥',
  pink: '🟥',
  purple: '🟪',
  lavender: '🟪',
  brown: '🟫',
  beige: '🟨',
  cream: '⬜',
}

export function isItemColorValue(value: string): value is ItemColorValue {
  return ITEM_COLOR_VALUES.includes(value as ItemColorValue)
}

export function normalizeItemColor(value: string | undefined | null): ItemColorValue {
  if (!value) {
    return ''
  }
  return isItemColorValue(value) ? value : ''
}

export function getColorSwatch(color: ItemColorValue) {
  return ITEM_COLOR_SWATCH_BY_VALUE[color]
}
