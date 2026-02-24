import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70',
  {
    variants: {
      variant: {
        default: 'bg-emerald-700 text-white hover:bg-emerald-800',
        secondary: 'bg-slate-200 text-slate-900 hover:bg-slate-300',
        ghost: 'text-slate-700 hover:bg-slate-100',
        danger: 'bg-rose-700 text-white hover:bg-rose-800',
        outline: 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-50',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-11 rounded-md px-6',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    )
  },
)

Button.displayName = 'Button'

