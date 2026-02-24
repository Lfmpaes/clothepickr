import { cn } from '@/lib/utils'

interface BrandLogoProps {
  className?: string
  compact?: boolean
}

export function BrandLogo({ className, compact = false }: BrandLogoProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <img
        src="/clothepickr-icon.svg"
        alt="ClothePickr logo"
        className={compact ? 'h-8 w-8 rounded-lg' : 'h-10 w-10 rounded-xl'}
      />
      <div className={cn('leading-tight', compact ? 'hidden sm:block' : undefined)}>
        <p className="text-base font-bold tracking-tight text-emerald-800 dark:text-emerald-300">
          ClothePickr
        </p>
        {!compact ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">Smart local wardrobe manager</p>
        ) : null}
      </div>
    </div>
  )
}

