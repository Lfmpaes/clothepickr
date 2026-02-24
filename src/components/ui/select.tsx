import * as React from 'react'
import { cn } from '@/lib/utils'

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => {
  return (
    <select
      className={cn(
        'h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70',
        className,
      )}
      ref={ref}
      {...props}
    />
  )
})

Select.displayName = 'Select'

