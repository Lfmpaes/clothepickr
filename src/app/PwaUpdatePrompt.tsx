import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from '@/components/ui/button'

export function PwaUpdatePrompt() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration>()
  const { needRefresh, updateServiceWorker } = useRegisterSW({
    onRegisteredSW: (_, swRegistration) => {
      if (swRegistration) {
        setRegistration(swRegistration)
      }
    },
  })

  useEffect(() => {
    if (!registration) {
      return
    }

    const checkForUpdates = () => {
      void registration.update()
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates()
      }
    }

    const intervalId = window.setInterval(checkForUpdates, 60 * 60 * 1000)
    window.addEventListener('focus', checkForUpdates)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', checkForUpdates)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [registration])

  useEffect(() => {
    if (!needRefresh[0]) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      void updateServiceWorker(true)
    }, 1200)

    return () => window.clearTimeout(timeoutId)
  }, [needRefresh, updateServiceWorker])

  if (!needRefresh[0]) {
    return null
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 rounded-lg border border-emerald-200 bg-white p-3 shadow-lg md:left-auto md:right-4 md:w-80">
      <p className="text-sm font-medium text-slate-900">Update available</p>
      <p className="mt-1 text-xs text-slate-600">A newer version of ClothePickr is ready.</p>
      <Button
        className="mt-3 w-full"
        size="sm"
        onClick={() => {
          void updateServiceWorker(true)
        }}
      >
        Refresh app
      </Button>
    </div>
  )
}

