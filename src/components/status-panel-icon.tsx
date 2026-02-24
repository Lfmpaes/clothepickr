import { CheckCircle2, AlertCircle, Droplets, Wind } from 'lucide-react'
import type { ClothingStatus } from '@/lib/types'

interface StatusPanelIconProps {
  status: ClothingStatus
}

export function StatusPanelIcon({ status }: StatusPanelIconProps) {
  if (status === 'clean') {
    return <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
  }
  if (status === 'dirty') {
    return <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-300" />
  }
  if (status === 'washing') {
    return <Droplets className="h-5 w-5 text-sky-600 dark:text-sky-300" />
  }
  return <Wind className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
}

