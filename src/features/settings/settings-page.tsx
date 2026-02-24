import { useState } from 'react'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { resetDatabase } from '@/lib/db'

export function SettingsPage() {
  const [message, setMessage] = useState<string>()

  const handleReset = async () => {
    const confirmed = window.confirm(
      'Reset all local ClothePickr data? This cannot be undone.',
    )
    if (!confirmed) {
      return
    }

    await resetDatabase()
    setMessage('Local data reset complete.')
  }

  return (
    <section>
      <PageHeader title="Settings" subtitle="Manage local app data and environment info." />

      <Card>
        <CardTitle>Local storage</CardTitle>
        <CardDescription className="mt-1">
          ClothePickr v1 stores all information in your browser IndexedDB.
        </CardDescription>
        <Button className="mt-3" variant="danger" onClick={handleReset}>
          Reset all local data
        </Button>
        {message ? <p className="mt-2 text-sm text-emerald-700">{message}</p> : null}
      </Card>
    </section>
  )
}

