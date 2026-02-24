import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
  {
    variants: {
      variant: {
        default: 'bg-slate-200 text-slate-800',
        clean: 'bg-emerald-100 text-emerald-800',
        dirty: 'bg-amber-100 text-amber-800',
        washing: 'bg-sky-100 text-sky-800',
        drying: 'bg-indigo-100 text-indigo-800',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export type BadgeProps = HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

