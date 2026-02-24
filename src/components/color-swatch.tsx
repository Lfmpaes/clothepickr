import { cn } from '@/lib/utils'

interface ColorSwatchProps {
  color?: string
  rainbow?: boolean
  className?: string
}

export function ColorSwatch({ color, rainbow = false, className }: ColorSwatchProps) {
  return (
    <span
      className={cn('h-4 w-4 shrink-0 rounded-[4px] border border-slate-300', className)}
      style={
        rainbow
          ? {
              backgroundImage:
                'conic-gradient(from 0deg, #ef4444, #f97316, #eab308, #22c55e, #06b6d4, #3b82f6, #8b5cf6, #ec4899, #ef4444)',
            }
          : {
              backgroundColor: color ?? '#ffffff',
            }
      }
      aria-hidden
    />
  )
}
