import { useRef, useState, type ChangeEvent } from 'react'
import { Moon, Sun, Upload } from 'lucide-react'
import { useTheme } from '@/app/theme-context'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { createBackupSnapshot, resetDatabase, restoreBackupSnapshot } from '@/lib/db'
import { Input } from '@/components/ui/input'

export function SettingsPage() {
  const { theme, toggleTheme } = useTheme()
  const [message, setMessage] = useState<string>()
  const [error, setError] = useState<string>()
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const restoreInputRef = useRef<HTMLInputElement>(null)

  const handleReset = async () => {
    setError(undefined)
    setMessage(undefined)
    const confirmed = window.confirm(
      'Reset all local ClothePickr data? This cannot be undone.',
    )
    if (!confirmed) {
      return
    }

    await resetDatabase()
    setMessage('Local data reset complete.')
  }

  const handleExport = async () => {
    setError(undefined)
    setMessage(undefined)
    setIsExporting(true)

    try {
      const snapshot = await createBackupSnapshot()
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `clothepickr-backup-${new Date()
        .toISOString()
        .replace(/[:.]/g, '-')}.json`
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(url)

      setMessage('Backup file downloaded.')
    } catch (backupError) {
      setError(backupError instanceof Error ? backupError.message : 'Could not create backup.')
    } finally {
      setIsExporting(false)
    }
  }

  const handleRestoreFilePick = () => {
    restoreInputRef.current?.click()
  }

  const handleRestore = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setError(undefined)
    setMessage(undefined)
    setIsImporting(true)

    try {
      const rawText = await file.text()
      const parsed = JSON.parse(rawText) as unknown
      const confirmed = window.confirm(
        'Restore this backup now? Current local data will be replaced.',
      )
      if (!confirmed) {
        return
      }

      await restoreBackupSnapshot(parsed)
      setMessage('Backup restored successfully.')
    } catch (restoreError) {
      setError(restoreError instanceof Error ? restoreError.message : 'Could not restore backup.')
    } finally {
      setIsImporting(false)
      event.target.value = ''
    }
  }

  return (
    <section>
      <PageHeader title="Settings" subtitle="Manage local app data and environment info." />

      <Card className="mb-4">
        <CardTitle>Theme</CardTitle>
        <CardDescription className="mt-1">
          Toggle between light and dark mode.
        </CardDescription>
        <Button className="mt-3" variant="outline" onClick={toggleTheme}>
          {theme === 'dark' ? (
            <>
              <Sun className="mr-2 h-4 w-4" /> Switch to light mode
            </>
          ) : (
            <>
              <Moon className="mr-2 h-4 w-4" /> Switch to dark mode
            </>
          )}
        </Button>
      </Card>

      <Card className="mb-4">
        <CardTitle>Backup and restore</CardTitle>
        <CardDescription className="mt-1">
          Export your local IndexedDB data to JSON and restore it later on this device.
        </CardDescription>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleExport} disabled={isExporting}>
            {isExporting ? 'Preparing backup...' : 'Download backup'}
          </Button>
          <Button variant="secondary" onClick={handleRestoreFilePick} disabled={isImporting}>
            <Upload className="mr-2 h-4 w-4" />
            {isImporting ? 'Restoring...' : 'Restore backup'}
          </Button>
          <Input
            ref={restoreInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleRestore}
          />
        </div>
      </Card>

      <Card>
        <CardTitle>Local storage</CardTitle>
        <CardDescription className="mt-1">
          ClothePickr v1 stores all information in your browser IndexedDB.
        </CardDescription>
        <Button className="mt-3" variant="danger" onClick={handleReset}>
          Reset all local data
        </Button>
      </Card>

      {message ? <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-400">{message}</p> : null}
      {error ? <p className="mt-2 text-sm text-rose-700 dark:text-rose-400">{error}</p> : null}
    </section>
  )
}
