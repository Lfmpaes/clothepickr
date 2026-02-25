import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocale } from '@/app/locale-context'
import { completeCloudAuthFromUrl } from '@/lib/cloud/auth'
import { cloudSyncEngine } from '@/lib/cloud/sync-engine'

export function AuthCallbackPage() {
  const navigate = useNavigate()
  const { t } = useLocale()
  const [error, setError] = useState<string>()

  useEffect(() => {
    let active = true

    const run = async () => {
      try {
        await completeCloudAuthFromUrl()
        await cloudSyncEngine.start()

        if (active) {
          navigate('/settings?cloudAuth=success', { replace: true })
        }
      } catch (callbackError) {
        if (!active) {
          return
        }

        setError(callbackError instanceof Error ? callbackError.message : t('cloudSync.auth.callbackError'))
      }
    }

    void run()

    return () => {
      active = false
    }
  }, [navigate, t])

  return (
    <section className="py-8">
      <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        {t('cloudSync.auth.callbackTitle')}
      </h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        {error ?? t('cloudSync.auth.callbackLoading')}
      </p>
    </section>
  )
}
