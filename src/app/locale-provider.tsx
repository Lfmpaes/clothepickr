import { useEffect, useState, type ReactNode } from 'react'
import { LocaleContext, type LocaleContextValue } from '@/app/locale-context'
import {
  SUPPORTED_LOCALES,
  translations,
  type Locale,
  type TranslationKey,
} from '@/lib/i18n/translations'

const LOCALE_STORAGE_KEY = 'clothepickr-locale'

function parseLocale(value: string | null): Locale | undefined {
  if (!value) {
    return undefined
  }

  return SUPPORTED_LOCALES.find((locale) => locale === value)
}

function normalizeDeviceLocale(value: string): Locale {
  const lower = value.toLowerCase()
  if (lower.startsWith('pt')) {
    return 'pt-BR'
  }
  return 'en-US'
}

function resolveInitialLocale(): Locale {
  const stored = parseLocale(localStorage.getItem(LOCALE_STORAGE_KEY))
  if (stored) {
    return stored
  }

  return normalizeDeviceLocale(navigator.language)
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(resolveInitialLocale)

  const setLocale = (nextLocale: Locale) => {
    localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale)
    setLocaleState(nextLocale)
  }

  const t = (key: TranslationKey, params?: Record<string, string | number>) => {
    const template = translations[locale][key] ?? translations['en-US'][key] ?? key
    if (!params) {
      return template
    }

    return Object.entries(params).reduce((result, [paramKey, paramValue]) => {
      return result.replace(`{${paramKey}}`, String(paramValue))
    }, template)
  }

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const value: LocaleContextValue = {
    locale,
    setLocale,
    t,
  }

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}
