import { useRef, useState, type ChangeEvent } from 'react'
import { Moon, Sun, Upload } from 'lucide-react'
import { useLocale } from '@/app/locale-context'
import { useTheme } from '@/app/theme-context'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { createBackupSnapshot, resetDatabase, restoreBackupSnapshot } from '@/lib/db'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import type { Locale } from '@/lib/i18n/translations'

export function SettingsPage() {
  const { locale, setLocale, t } = useLocale()
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
      t('settings.confirm.reset'),
    )
    if (!confirmed) {
      return
    }

    await resetDatabase()
    setMessage(t('settings.message.resetDone'))
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

      setMessage(t('settings.message.backupDone'))
    } catch (backupError) {
      setError(backupError instanceof Error ? backupError.message : t('settings.error.backup'))
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
        t('settings.confirm.restore'),
      )
      if (!confirmed) {
        return
      }

      await restoreBackupSnapshot(parsed)
      setMessage(t('settings.message.restoreDone'))
    } catch (restoreError) {
      setError(restoreError instanceof Error ? restoreError.message : t('settings.error.restore'))
    } finally {
      setIsImporting(false)
      event.target.value = ''
    }
  }

  return (
    <section>
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />

      <Card className="mb-4">
        <CardTitle>{t('settings.language.title')}</CardTitle>
        <CardDescription className="mt-1">{t('settings.language.description')}</CardDescription>
        <div className="mt-3 max-w-xs">
          <Label htmlFor="language-select">{t('settings.language.label')}</Label>
          <Select
            id="language-select"
            value={locale}
            onValueChange={(value) => setLocale(value as Locale)}
            options={[
              { value: 'en-US', label: t('settings.language.enUS') },
              { value: 'pt-BR', label: t('settings.language.ptBR') },
            ]}
          />
        </div>
      </Card>

      <Card className="mb-4">
        <CardTitle>{t('settings.theme.title')}</CardTitle>
        <CardDescription className="mt-1">{t('settings.theme.description')}</CardDescription>
        <Button className="mt-3" variant="outline" onClick={toggleTheme}>
          {theme === 'dark' ? (
            <>
              <Sun className="mr-2 h-4 w-4" /> {t('settings.theme.toLight')}
            </>
          ) : (
            <>
              <Moon className="mr-2 h-4 w-4" /> {t('settings.theme.toDark')}
            </>
          )}
        </Button>
      </Card>

      <Card className="mb-4">
        <CardTitle>{t('settings.backup.title')}</CardTitle>
        <CardDescription className="mt-1">{t('settings.backup.description')}</CardDescription>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleExport} disabled={isExporting}>
            {isExporting ? t('settings.backup.preparing') : t('settings.backup.download')}
          </Button>
          <Button variant="secondary" onClick={handleRestoreFilePick} disabled={isImporting}>
            <Upload className="mr-2 h-4 w-4" />
            {isImporting ? t('settings.backup.restoring') : t('settings.backup.restore')}
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
        <CardTitle>{t('settings.storage.title')}</CardTitle>
        <CardDescription className="mt-1">{t('settings.storage.description')}</CardDescription>
        <Button className="mt-3" variant="danger" onClick={handleReset}>
          {t('settings.storage.reset')}
        </Button>
      </Card>

      {message ? <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-400">{message}</p> : null}
      {error ? <p className="mt-2 text-sm text-rose-700 dark:text-rose-400">{error}</p> : null}
    </section>
  )
}
