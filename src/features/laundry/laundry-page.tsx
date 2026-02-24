import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useLocale } from '@/app/locale-context'
import { PageHeader } from '@/components/page-header'
import { StatusPanelIcon } from '@/components/status-panel-icon'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { STATUS_ORDER } from '@/lib/constants'
import { itemRepository, laundryRepository, statusMachine } from '@/lib/db'
import { getLocalizedReasonLabel, getLocalizedStatusLabel } from '@/lib/i18n/helpers'
import type { ClothingStatus } from '@/lib/types'
import { formatDateTime } from '@/lib/utils'

export function LaundryPage() {
  const { t } = useLocale()
  const items = useLiveQuery(() => itemRepository.list(), [], [])
  const logs = useLiveQuery(() => laundryRepository.listRecent(40), [], [])
  const [error, setError] = useState<string>()

  const byStatus = useMemo(
    () =>
      STATUS_ORDER.map((status) => ({
        status,
        items: items.filter((item) => item.status === status),
      })),
    [items],
  )

  const handleBatchAdvance = async (status: ClothingStatus) => {
    const statusItems = items.filter((item) => item.status === status)
    if (statusItems.length === 0) {
      return
    }

    setError(undefined)
    try {
      const next = statusMachine.nextSuggestedStatus(status)
      for (const item of statusItems) {
        await statusMachine.transition(item.id, next, 'cycle')
      }
    } catch {
      setError(t('laundry.errorBatch'))
    }
  }

  const handleSingleAdvance = async (itemId: string, current: ClothingStatus) => {
    setError(undefined)
    try {
      await statusMachine.transition(itemId, statusMachine.nextSuggestedStatus(current), 'cycle')
    } catch {
      setError(t('laundry.errorSingle'))
    }
  }

  return (
    <section>
      <PageHeader
        title={t('laundry.title')}
        subtitle={t('laundry.subtitle')}
      />

      {error ? (
        <p className="mb-3 rounded-md border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-4">
        {byStatus.map((column) => (
          <Card key={column.status}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <StatusPanelIcon status={column.status} />
                <CardTitle>{getLocalizedStatusLabel(column.status, t)}</CardTitle>
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-100">
                {column.items.length}
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="mt-2 w-full"
              onClick={() => handleBatchAdvance(column.status)}
            >
              {t('laundry.moveAllTo', {
                status: getLocalizedStatusLabel(statusMachine.nextSuggestedStatus(column.status), t),
              })}
            </Button>

            <div className="mt-3 space-y-2">
              {column.items.length === 0 ? (
                <CardDescription>{t('laundry.noItems')}</CardDescription>
              ) : (
                column.items.map((item) => (
                  <div key={item.id} className="rounded-md border border-slate-200 p-2">
                    <p className="text-sm font-medium">{item.name}</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-1 w-full"
                      onClick={() => handleSingleAdvance(item.id, item.status)}
                    >
                      {t('laundry.moveTo', {
                        status: getLocalizedStatusLabel(statusMachine.nextSuggestedStatus(item.status), t),
                      })}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-5">
        <CardTitle>{t('laundry.recentTitle')}</CardTitle>
        <div className="mt-3 space-y-2">
          {logs.length === 0 ? (
            <CardDescription>{t('laundry.noLogs')}</CardDescription>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="rounded-md border border-slate-200 px-3 py-2 text-sm">
                <p className="font-medium">
                  {t('laundry.transition', {
                    from: getLocalizedStatusLabel(log.fromStatus, t),
                    to: getLocalizedStatusLabel(log.toStatus, t),
                    reason: getLocalizedReasonLabel(log.reason, t),
                  })}
                </p>
                <p className="text-xs text-slate-500">{formatDateTime(log.changedAt)}</p>
              </div>
            ))
          )}
        </div>
      </Card>
    </section>
  )
}
