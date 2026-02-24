import { useLocale } from '@/app/locale-context'
import { getLocalizedStatusLabel } from '@/lib/i18n/helpers'
import type { ClothingStatus } from '@/lib/types'
import { Badge } from '@/components/ui/badge'

interface StatusBadgeProps {
  status: ClothingStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useLocale()
  return <Badge variant={status}>{getLocalizedStatusLabel(status, t)}</Badge>
}
