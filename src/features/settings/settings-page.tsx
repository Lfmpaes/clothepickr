import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Moon, Sun, Upload } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
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
import { useCloudSyncState } from '@/lib/cloud/sync-state-store'
import { getCloudUser, sendMagicLink, signOutCloud, verifyEmailOtpCode } from '@/lib/cloud/auth'
import { isSupabaseConfigured } from '@/lib/cloud/supabase-client'
import { cloudSyncEngine } from '@/lib/cloud/sync-engine'
import { Checkbox } from '@/components/ui/checkbox'
import { formatDateTime } from '@/lib/utils'

export function SettingsPage() {
  const { locale, setLocale, t } = useLocale()
  const { theme, toggleTheme } = useTheme()
  const cloudState = useCloudSyncState()
  const [searchParams, setSearchParams] = useSearchParams()

  const [message, setMessage] = useState<string>()
  const [error, setError] = useState<string>()
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [magicLinkEmail, setMagicLinkEmail] = useState('')
  const [emailCode, setEmailCode] = useState('')
  const [linkedEmail, setLinkedEmail] = useState<string>()
  const [isCloudActionRunning, setIsCloudActionRunning] = useState(false)
  const [isSendingMagicLink, setIsSendingMagicLink] = useState(false)
  const [isVerifyingCode, setIsVerifyingCode] = useState(false)
  const [cloudMessage, setCloudMessage] = useState<string>()
  const [cloudError, setCloudError] = useState<string>()

  const restoreInputRef = useRef<HTMLInputElement>(null)

  const cloudConfigured = isSupabaseConfigured()

  useEffect(() => {
    let active = true

    const loadUser = async () => {
      if (!cloudState.authenticated) {
        if (active) {
          setLinkedEmail(undefined)
        }
        return
      }

      try {
        const user = await getCloudUser()
        if (active) {
          setLinkedEmail(user?.email ?? undefined)
        }
      } catch {
        if (active) {
          setLinkedEmail(undefined)
        }
      }
    }

    void loadUser()

    return () => {
      active = false
    }
  }, [cloudState.authenticated])

  useEffect(() => {
    if (searchParams.get('cloudAuth') !== 'success') {
      return
    }

    setCloudMessage(t('cloudSync.message.signedIn'))
    setCloudError(undefined)
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.delete('cloudAuth')
      return next
    }, { replace: true })
  }, [searchParams, setSearchParams, t])

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

  const handleSendMagicLink = async () => {
    const email = magicLinkEmail.trim()

    setCloudError(undefined)
    setCloudMessage(undefined)

    if (!email || !email.includes('@')) {
      setCloudError(t('cloudSync.error.invalidEmail'))
      return
    }

    if (!cloudConfigured) {
      setCloudError(t('cloudSync.error.notConfigured'))
      return
    }

    setIsSendingMagicLink(true)
    try {
      await sendMagicLink(email)
      setCloudMessage(t('cloudSync.message.magicLinkSent'))
    } catch (cloudError) {
      setCloudError(cloudError instanceof Error ? cloudError.message : t('cloudSync.error.actionFailed'))
    } finally {
      setIsSendingMagicLink(false)
    }
  }

  const handleVerifyCode = async () => {
    const email = magicLinkEmail.trim()
    const code = emailCode.trim()

    setCloudError(undefined)
    setCloudMessage(undefined)

    if (!email || !email.includes('@')) {
      setCloudError(t('cloudSync.error.invalidEmail'))
      return
    }

    if (!code) {
      setCloudError(t('cloudSync.error.invalidCode'))
      return
    }

    if (!cloudConfigured) {
      setCloudError(t('cloudSync.error.notConfigured'))
      return
    }

    setIsVerifyingCode(true)
    try {
      await verifyEmailOtpCode(email, code)
      const user = await getCloudUser()
      setLinkedEmail(user?.email ?? undefined)
      setEmailCode('')
      setCloudMessage(t('cloudSync.message.codeVerified'))
    } catch (verifyError) {
      setCloudError(verifyError instanceof Error ? verifyError.message : t('cloudSync.error.actionFailed'))
    } finally {
      setIsVerifyingCode(false)
    }
  }

  const handleToggleCloudSync = async (event: ChangeEvent<HTMLInputElement>) => {
    setCloudError(undefined)
    setCloudMessage(undefined)
    setIsCloudActionRunning(true)

    try {
      await cloudSyncEngine.setEnabled(event.target.checked)
      setCloudMessage(
        event.target.checked
          ? t('cloudSync.message.syncEnabled')
          : t('cloudSync.message.syncDisabled'),
      )
    } catch (cloudError) {
      setCloudError(cloudError instanceof Error ? cloudError.message : t('cloudSync.error.actionFailed'))
    } finally {
      setIsCloudActionRunning(false)
    }
  }

  const handleCloudSyncNow = async () => {
    setCloudError(undefined)
    setCloudMessage(undefined)
    setIsCloudActionRunning(true)

    try {
      await cloudSyncEngine.syncNow('manual')
      setCloudMessage(t('cloudSync.message.syncTriggered'))
    } catch (cloudError) {
      setCloudError(cloudError instanceof Error ? cloudError.message : t('cloudSync.error.actionFailed'))
    } finally {
      setIsCloudActionRunning(false)
    }
  }

  const handleCloudSignOut = async () => {
    setCloudError(undefined)
    setCloudMessage(undefined)
    setIsCloudActionRunning(true)

    try {
      await signOutCloud()
      setCloudMessage(t('cloudSync.message.signedOut'))
    } catch (cloudError) {
      setCloudError(cloudError instanceof Error ? cloudError.message : t('cloudSync.error.actionFailed'))
    } finally {
      setIsCloudActionRunning(false)
    }
  }

  const handleCloudErase = async () => {
    setCloudError(undefined)
    setCloudMessage(undefined)
    const confirmed = window.confirm(t('cloudSync.confirm.eraseCloud'))
    if (!confirmed) {
      return
    }

    setIsCloudActionRunning(true)
    try {
      await cloudSyncEngine.wipeCloudData()
      setCloudMessage(t('cloudSync.message.cloudErased'))
    } catch (cloudError) {
      setCloudError(cloudError instanceof Error ? cloudError.message : t('cloudSync.error.actionFailed'))
    } finally {
      setIsCloudActionRunning(false)
    }
  }

  const cloudStatusLabel = t(`cloudSync.status.${cloudState.status}`)
  const lastSyncedLabel = cloudState.lastSyncedAt
    ? formatDateTime(cloudState.lastSyncedAt)
    : t('cloudSync.notSyncedYet')

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
        <CardTitle>{t('cloudSync.title')}</CardTitle>
        <CardDescription className="mt-1">{t('cloudSync.description')}</CardDescription>

        {!cloudConfigured ? (
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{t('cloudSync.notConfigured')}</p>
        ) : null}

        {cloudConfigured && !cloudState.authenticated ? (
          <div className="mt-3 max-w-sm space-y-2">
            <Label htmlFor="cloud-email">{t('cloudSync.emailLabel')}</Label>
            <Input
              id="cloud-email"
              type="email"
              value={magicLinkEmail}
              placeholder={t('cloudSync.emailPlaceholder')}
              onChange={(event) => setMagicLinkEmail(event.target.value)}
            />
            <Button onClick={handleSendMagicLink} disabled={isSendingMagicLink}>
              {isSendingMagicLink ? t('cloudSync.sendingLink') : t('cloudSync.sendLink')}
            </Button>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('cloudSync.magicLinkHint')}</p>

            <Label htmlFor="cloud-email-code">{t('cloudSync.codeLabel')}</Label>
            <Input
              id="cloud-email-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={emailCode}
              placeholder={t('cloudSync.codePlaceholder')}
              onChange={(event) => setEmailCode(event.target.value)}
            />
            <Button variant="outline" onClick={handleVerifyCode} disabled={isVerifyingCode}>
              {isVerifyingCode ? t('cloudSync.verifyingCode') : t('cloudSync.verifyCode')}
            </Button>

            {cloudMessage ? (
              <p className="text-sm text-emerald-700 dark:text-emerald-400">{cloudMessage}</p>
            ) : null}
            {cloudError ? <p className="text-sm text-rose-700 dark:text-rose-400">{cloudError}</p> : null}
            {cloudState.lastError ? (
              <p className="text-sm text-rose-700 dark:text-rose-400">{cloudState.lastError}</p>
            ) : null}
          </div>
        ) : null}

        {cloudConfigured && cloudState.authenticated ? (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-slate-700 dark:text-slate-200">
              {t('cloudSync.signedInAs', { email: linkedEmail ?? 'unknown' })}
            </p>

            <div className="flex items-center gap-2">
              <Checkbox
                id="cloud-sync-enabled"
                checked={cloudState.enabled}
                onChange={handleToggleCloudSync}
                disabled={isCloudActionRunning}
              />
              <Label htmlFor="cloud-sync-enabled">{t('cloudSync.enabledLabel')}</Label>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('cloudSync.enabledDescription')}</p>

            <div className="grid gap-1 text-sm text-slate-700 dark:text-slate-200">
              <p>
                <span className="font-medium">{t('cloudSync.statusLabel')}:</span> {cloudStatusLabel}
              </p>
              <p>
                <span className="font-medium">{t('cloudSync.pendingLabel')}:</span> {cloudState.pendingCount}
              </p>
              <p>
                <span className="font-medium">{t('cloudSync.lastSyncedLabel')}:</span> {lastSyncedLabel}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={handleCloudSyncNow}
                disabled={!cloudState.enabled || isCloudActionRunning}
              >
                {isCloudActionRunning ? t('cloudSync.syncingNow') : t('cloudSync.syncNow')}
              </Button>
              <Button variant="secondary" onClick={handleCloudSignOut} disabled={isCloudActionRunning}>
                {t('cloudSync.signOut')}
              </Button>
              <Button variant="danger" onClick={handleCloudErase} disabled={isCloudActionRunning}>
                {isCloudActionRunning ? t('cloudSync.erasingCloud') : t('cloudSync.eraseCloud')}
              </Button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('cloudSync.eraseHint')}</p>

            {cloudMessage ? (
              <p className="text-sm text-emerald-700 dark:text-emerald-400">{cloudMessage}</p>
            ) : null}
            {cloudError ? <p className="text-sm text-rose-700 dark:text-rose-400">{cloudError}</p> : null}
            {cloudState.lastError ? (
              <p className="text-sm text-rose-700 dark:text-rose-400">{cloudState.lastError}</p>
            ) : null}
          </div>
        ) : null}
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
