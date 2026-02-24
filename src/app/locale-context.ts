import { createContext, useContext } from 'react'
import type { Locale, TranslationKey } from '@/lib/i18n/translations'

export interface LocaleContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
}

export const LocaleContext = createContext<LocaleContextValue | undefined>(undefined)

export function useLocale() {
  const context = useContext(LocaleContext)
  if (!context) {
    throw new Error('useLocale must be used within LocaleProvider.')
  }

  return context
}

