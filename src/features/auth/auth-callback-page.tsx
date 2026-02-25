import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocale } from '@/app/locale-context'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { completeCloudAuthFromUrl } from '@/lib/cloud/auth'
import { cloudSyncEngine } from '@/lib/cloud/sync-engine'

export function AuthCallbackPage() {
  const { t } = useLocale()
  const navigate = useNavigate()
  const [error, setError] = useState<string>()

  useEffect(() => {
    let cancelled = false
    const completeAuth = async () => {
      try {
        await completeCloudAuthFromUrl()
        await cloudSyncEngine.start()
        if (!cancelled) {
          navigate('/settings?cloudAuth=success', { replace: true })
        }
      } catch (callbackError) {
        if (!cancelled) {
          setError(
            callbackError instanceof Error
              ? callbackError.message
              : t('cloudSync.callback.failed'),
          )
        }
      }
    }

    void completeAuth()

    return () => {
      cancelled = true
    }
  }, [navigate, t])

  return (
    <section>
      <Card>
        <CardTitle>{t('cloudSync.callback.title')}</CardTitle>
        <CardDescription className="mt-1">
          {error ?? t('cloudSync.callback.processing')}
        </CardDescription>
        {error ? (
          <Button
            className="mt-3"
            onClick={() => {
              navigate('/settings', { replace: true })
            }}
          >
            {t('cloudSync.callback.returnSettings')}
          </Button>
        ) : null}
      </Card>
    </section>
  )
}
