import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'

export function NotFoundPage() {
  return (
    <Card className="mx-auto mt-12 max-w-md text-center">
      <CardTitle>Page not found</CardTitle>
      <CardDescription className="mt-2">
        The route does not exist in ClothePickr.
      </CardDescription>
      <Link to="/" className="mt-4 inline-block">
        <Button>Go home</Button>
      </Link>
    </Card>
  )
}

