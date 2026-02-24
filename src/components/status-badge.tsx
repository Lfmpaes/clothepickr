import { STATUS_LABEL } from '@/lib/constants'
import type { ClothingStatus } from '@/lib/types'
import { Badge } from '@/components/ui/badge'

interface StatusBadgeProps {
  status: ClothingStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return <Badge variant={status}>{STATUS_LABEL[status]}</Badge>
}

