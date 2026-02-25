import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Moon, Sun, Upload } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useLocale } from '@/app/locale-context'
import { useTheme } from '@/app/theme-context'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  getCloudUser,
  sendMagicLink,
  signOutCloud,
  verifyEmailOtpCode,
} from '@/lib/cloud/auth'
import { cloudSyncEngine } from '@/lib/cloud/sync-engine'
import { isSupabaseConfigured } from '@/lib/cloud/supabase-client'
import { useCloudSyncState } from '@/lib/cloud/sync-state-store'
import { createBackupSnapshot, resetDatabase, restoreBackupSnapshot } from '@/lib/db'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import type { Locale } from '@/lib/i18n/translations'
import { formatDateTime } from '@/lib/utils'

export function SettingsPage() {
  const { locale, setLocale, t } = useLocale()
  const { theme, toggleTheme } = useTheme()
  const cloudState = useCloudSyncState()
  const [searchParams, setSearchParams] = useSearchParams()
  const [cloudEmail, setCloudEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [cloudUserEmail, setCloudUserEmail] = useState<string>()
  const [cloudAuthMessage, setCloudAuthMessage] = useState<string>()
  const [cloudAuthError, setCloudAuthError] = useState<string>()
  const [isSendingMagicLink, setIsSendingMagicLink] = useState(false)
  const [isVerifyingCode, setIsVerifyingCode] = useState(false)
  const [isTogglingSync, setIsTogglingSync] = useState(false)
  const [isSyncingNow, setIsSyncingNow] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [message, setMessage] = useState<string>()
  const [error, setError] = useState<string>()
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const restoreInputRef = useRef<HTMLInputElement>(null)
  const supabaseReady = isSupabaseConfigured()

  useEffect(() => {
    if (!supabaseReady) {
      setCloudUserEmail(undefined)
      return
    }

    const syncUser = async () => {
      try {
        const user = await getCloudUser()
        setCloudUserEmail(user?.email)
        if (user?.email) {
          setCloudEmail(user.email)
        }
      } catch {
        setCloudUserEmail(undefined)
      }
    }

    void syncUser()
  }, [cloudState.authenticated, supabaseReady])

  useEffect(() => {
    if (searchParams.get('cloudAuth') !== 'success') {
      return
    }

    setCloudAuthMessage(t('cloudSync.message.callbackSuccess'))
    setCloudAuthError(undefined)
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.delete('cloudAuth')
      return next
    }, { replace: true })
  }, [searchParams, setSearchParams, t])

  const handleSendMagicLink = async () => {
    setCloudAuthMessage(undefined)
    setCloudAuthError(undefined)

    if (!supabaseReady) {
      setCloudAuthError(t('cloudSync.error.notConfigured'))
      return
    }

    const normalizedEmail = cloudEmail.trim()
    if (!normalizedEmail) {
      setCloudAuthError(t('cloudSync.error.invalidEmail'))
      return
    }

    setIsSendingMagicLink(true)
    try {
      await sendMagicLink(normalizedEmail)
      setCloudAuthMessage(t('cloudSync.message.magicLinkSent'))
    } catch (magicLinkError) {
      setCloudAuthError(
        magicLinkError instanceof Error
          ? magicLinkError.message
          : t('cloudSync.error.sendMagicLink'),
      )
    } finally {
      setIsSendingMagicLink(false)
    }
  }

  const handleVerifyCode = async () => {
    setCloudAuthMessage(undefined)
    setCloudAuthError(undefined)

    if (!supabaseReady) {
      setCloudAuthError(t('cloudSync.error.notConfigured'))
      return
    }

    const normalizedEmail = cloudEmail.trim()
    const normalizedCode = otpCode.trim()
    if (!normalizedEmail) {
      setCloudAuthError(t('cloudSync.error.invalidEmail'))
      return
    }
    if (!normalizedCode) {
      setCloudAuthError(t('cloudSync.error.invalidCode'))
      return
    }

    setIsVerifyingCode(true)
    try {
      await verifyEmailOtpCode(normalizedEmail, normalizedCode)
      await cloudSyncEngine.start()
      setOtpCode('')
      setCloudAuthMessage(t('cloudSync.message.codeVerified'))
      const user = await getCloudUser()
      setCloudUserEmail(user?.email)
    } catch (verifyError) {
      setCloudAuthError(
        verifyError instanceof Error ? verifyError.message : t('cloudSync.error.invalidCode'),
      )
    } finally {
      setIsVerifyingCode(false)
    }
  }

  const handleToggleSync = async (enabled: boolean) => {
    setCloudAuthMessage(undefined)
    setCloudAuthError(undefined)
    setIsTogglingSync(true)

    try {
      await cloudSyncEngine.setEnabled(enabled)
      if (enabled && !cloudState.authenticated) {
        setCloudAuthMessage(t('cloudSync.message.signInToStart'))
      }
    } catch (syncError) {
      setCloudAuthError(
        syncError instanceof Error ? syncError.message : t('cloudSync.error.toggleSync'),
      )
    } finally {
      setIsTogglingSync(false)
    }
  }

  const handleSyncNow = async () => {
    setCloudAuthError(undefined)
    setIsSyncingNow(true)
    try {
      await cloudSyncEngine.syncNow('manual')
    } catch (syncError) {
      setCloudAuthError(
        syncError instanceof Error ? syncError.message : t('cloudSync.error.syncNow'),
      )
    } finally {
      setIsSyncingNow(false)
    }
  }

  const handleSignOutCloud = async () => {
    setCloudAuthMessage(undefined)
    setCloudAuthError(undefined)
    setIsSigningOut(true)
    try {
      await signOutCloud()
      setCloudUserEmail(undefined)
      setCloudAuthMessage(t('cloudSync.message.signedOut'))
    } catch (signOutError) {
      setCloudAuthError(
        signOutError instanceof Error ? signOutError.message : t('cloudSync.error.signOut'),
      )
    } finally {
      setIsSigningOut(false)
    }
  }

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
        <CardTitle>{t('cloudSync.title')}</CardTitle>
        <CardDescription className="mt-1">{t('cloudSync.description')}</CardDescription>

        {!supabaseReady ? (
          <p className="mt-3 text-sm text-amber-700 dark:text-amber-400">
            {t('cloudSync.notConfigured')}
          </p>
        ) : null}

        {!cloudState.authenticated ? (
          <div className="mt-3 max-w-md space-y-3">
            <div>
              <Label htmlFor="cloud-email">{t('cloudSync.emailLabel')}</Label>
              <Input
                id="cloud-email"
                type="email"
                autoComplete="email"
                placeholder={t('cloudSync.emailPlaceholder')}
                value={cloudEmail}
                onChange={(event) => setCloudEmail(event.target.value)}
              />
            </div>

            <Button onClick={handleSendMagicLink} disabled={!supabaseReady || isSendingMagicLink}>
              {isSendingMagicLink
                ? t('cloudSync.sendingMagicLink')
                : t('cloudSync.sendMagicLink')}
            </Button>

            <div>
              <Label htmlFor="cloud-otp-code">{t('cloudSync.codeLabel')}</Label>
              <Input
                id="cloud-otp-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder={t('cloudSync.codePlaceholder')}
                value={otpCode}
                onChange={(event) => setOtpCode(event.target.value)}
              />
            </div>

            <Button
              variant="outline"
              onClick={handleVerifyCode}
              disabled={!supabaseReady || isVerifyingCode}
            >
              {isVerifyingCode ? t('cloudSync.verifyingCode') : t('cloudSync.verifyCode')}
            </Button>

            {cloudAuthMessage ? (
              <p className="text-sm text-emerald-700 dark:text-emerald-400">{cloudAuthMessage}</p>
            ) : null}
            {cloudAuthError ? (
              <p className="text-sm text-rose-700 dark:text-rose-400">{cloudAuthError}</p>
            ) : null}
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-slate-700 dark:text-slate-300">
              {t('cloudSync.linkedAs', { email: cloudUserEmail ?? '' })}
            </p>

            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <Checkbox
                checked={cloudState.enabled}
                onChange={(event) => {
                  void handleToggleSync(event.target.checked)
                }}
                disabled={isTogglingSync}
              />
              {t('cloudSync.enableToggle')}
            </label>

            <p className="text-sm text-slate-700 dark:text-slate-300">
              {t('cloudSync.statusLabel')}: {t(`cloudSync.status.${cloudState.status}`)}
            </p>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              {t('cloudSync.pendingCount', { count: cloudState.pendingCount })}
            </p>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              {cloudState.lastSyncedAt
                ? t('cloudSync.lastSynced', { at: formatDateTime(cloudState.lastSyncedAt) })
                : t('cloudSync.neverSynced')}
            </p>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={handleSyncNow}
                disabled={!cloudState.enabled || isSyncingNow}
              >
                {isSyncingNow ? t('cloudSync.syncingNow') : t('cloudSync.syncNow')}
              </Button>
              <Button variant="secondary" onClick={handleSignOutCloud} disabled={isSigningOut}>
                {isSigningOut ? t('cloudSync.signingOut') : t('cloudSync.signOut')}
              </Button>
            </div>

            {cloudAuthMessage ? (
              <p className="text-sm text-emerald-700 dark:text-emerald-400">{cloudAuthMessage}</p>
            ) : null}
            {cloudAuthError || cloudState.lastError ? (
              <p className="text-sm text-rose-700 dark:text-rose-400">
                {cloudAuthError ?? cloudState.lastError}
              </p>
            ) : null}
          </div>
        )}
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
