import {
  Cloud,
  Dumbbell,
  Footprints,
  Layers,
  Shield,
  Shirt,
  ShoppingBag,
  Tag,
  Watch,
  type LucideIcon,
} from 'lucide-react'

interface CategoryPanelIconProps {
  categoryName: string
  className?: string
}

const categoryIconByName: Record<string, LucideIcon> = {
  shirts: Shirt,
  pants: Layers,
  underwear: Shield,
  socks: Footprints,
  outerwear: Cloud,
  shoes: ShoppingBag,
  sportswear: Dumbbell,
  accessories: Watch,
}

export function CategoryPanelIcon({ categoryName, className }: CategoryPanelIconProps) {
  const normalized = categoryName.trim().toLowerCase()
  const Icon = categoryIconByName[normalized] ?? Tag
  return <Icon className={className ?? 'h-4 w-4 text-slate-500 dark:text-slate-300'} />
}

