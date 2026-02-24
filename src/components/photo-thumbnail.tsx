import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { useObjectUrl } from '@/lib/hooks/use-object-url'
import { cn } from '@/lib/utils'

interface PhotoThumbnailProps {
  photoId: string
  className?: string
  alt: string
}

export function PhotoThumbnail({ photoId, className, alt }: PhotoThumbnailProps) {
  const photo = useLiveQuery(() => db.photos.get(photoId), [photoId])
  const src = useObjectUrl(photo?.blob)

  if (!src) {
    return null
  }

  return (
    <img
      src={src}
      alt={alt}
      className={cn('h-24 w-24 rounded-md border border-slate-200 object-cover', className)}
      loading="lazy"
    />
  )
}

