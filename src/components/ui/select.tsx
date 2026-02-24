import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string
  label: string
  icon?: ReactNode
  disabled?: boolean
}

interface SelectProps {
  id?: string
  value: string
  options: SelectOption[]
  onValueChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function Select({
  id,
  value,
  options,
  onValueChange,
  placeholder,
  disabled,
  className,
}: SelectProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  const selected = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  )

  useEffect(() => {
    if (!open) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        id={id}
        type="button"
        className={cn(
          'h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-left text-sm text-slate-900 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100',
          'flex items-center justify-between gap-2',
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        disabled={disabled}
      >
        <span className="min-w-0 truncate">
          {selected ? (
            <span className="inline-flex items-center gap-2">
              {selected.icon ? <span className="inline-flex">{selected.icon}</span> : null}
              <span className="truncate">{selected.label}</span>
            </span>
          ) : (
            <span className="text-slate-400 dark:text-slate-500">{placeholder ?? ''}</span>
          )}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden />
      </button>

      {open ? (
        <div
          role="listbox"
          className="select-scrollbar absolute z-40 mt-1 max-h-60 w-full overflow-y-auto overflow-x-hidden rounded-md border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          {options.map((option) => {
            const isSelected = option.value === value

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={option.disabled}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm',
                  'hover:bg-slate-100 dark:hover:bg-slate-800',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                  isSelected ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100' : '',
                )}
                onClick={() => {
                  onValueChange(option.value)
                  setOpen(false)
                }}
              >
                {option.icon ? <span className="inline-flex">{option.icon}</span> : null}
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {isSelected ? <Check className="h-4 w-4 shrink-0" aria-hidden /> : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
