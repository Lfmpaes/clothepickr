import { Link } from 'react-router-dom'
import { useLocale } from '@/app/locale-context'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'

export function NotFoundPage() {
  const { t } = useLocale()

  return (
    <Card className="mx-auto mt-12 max-w-md text-center">
      <CardTitle>{t('notFound.title')}</CardTitle>
      <CardDescription className="mt-2">
        {t('notFound.description')}
      </CardDescription>
      <Link to="/" className="mt-4 inline-block">
        <Button>{t('notFound.home')}</Button>
      </Link>
    </Card>
  )
}
