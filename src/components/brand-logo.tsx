import { cn } from '@/lib/utils'
import { useLocale } from '@/app/locale-context'

interface BrandLogoProps {
  className?: string
  compact?: boolean
}

export function BrandLogo({ className, compact = false }: BrandLogoProps) {
  const { t } = useLocale()

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <img
        src="/clothepickr-icon.svg"
        alt={t('brand.logoAlt')}
        className={compact ? 'h-8 w-8 rounded-lg' : 'h-10 w-10 rounded-xl'}
      />
      <div className={cn('leading-tight', compact ? 'hidden sm:block' : undefined)}>
        <p className="text-base font-bold tracking-tight text-emerald-800 dark:text-emerald-300">
          {t('app.name')}
        </p>
        {!compact ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('brand.tagline')}</p>
        ) : null}
      </div>
    </div>
  )
}
