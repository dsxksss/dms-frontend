import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/page-header'
import { EmptyState, ErrorState } from '@/components/states'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useTenants, useSetTenantActive } from '@/hooks/use-platform'
import { useToastError } from '@/hooks/use-toast-error'
import { formatBytes } from '@/lib/format'
import { codeOf, tintOf } from '@/lib/tile'
import { cn } from '@/lib/utils'
import type { TenantAdminView } from '@/platform/api'
import { PlanBadge } from './plan-badge'
import { CreateTenantDialog } from './CreateTenantDialog'

const COLS = 'grid-cols-[1.5fr_110px_70px_70px_110px_128px]'

function TenantRow({ tenant }: { tenant: TenantAdminView }) {
  const { t } = useTranslation('platform')
  const navigate = useNavigate()
  const toastError = useToastError()
  const setActive = useSetTenantActive(tenant.id)
  const tint = tintOf(tenant.id)

  const onToggle = async (active: boolean) => {
    try {
      await setActive.mutateAsync(active)
      toast.success(active ? t('tenants.activatedDone') : t('tenants.suspendedDone'))
    } catch (e) {
      toastError(e)
    }
  }

  return (
    <div
      className={cn(
        'border-divider grid items-center gap-2 border-b px-[18px] py-3.5 text-[13px] last:border-0',
        COLS,
      )}
    >
      <button
        className="flex min-w-0 items-center gap-2.5 text-left"
        onClick={() => navigate(tenant.id)}
      >
        <span
          className="flex size-[30px] shrink-0 items-center justify-center rounded-[8px] text-[11px] font-extrabold"
          style={{ background: tint.bg, color: tint.fg }}
        >
          {codeOf(tenant.name)}
        </span>
        <span className="min-w-0">
          <span className="hover:text-brand block truncate font-bold">
            {tenant.name}
          </span>
          <span className="text-muted-foreground block truncate font-mono text-[11px]">
            @{tenant.slug}
          </span>
        </span>
      </button>
      <div>
        <PlanBadge plan={tenant.plan} />
      </div>
      <div className="font-mono text-[12.5px] tabular-nums">{tenant.usage.orgs}</div>
      <div className="font-mono text-[12.5px] tabular-nums">{tenant.usage.users}</div>
      <div className="font-mono text-[12.5px] tabular-nums">
        {formatBytes(tenant.usage.storage_used)}
      </div>
      <div className="flex items-center gap-2">
        <Switch
          checked={tenant.active}
          disabled={setActive.isPending}
          onCheckedChange={onToggle}
          aria-label={t('tenants.columns.status')}
        />
        <span
          className={cn(
            'text-[11.5px] font-semibold',
            tenant.active ? 'text-[#15803D]' : 'text-muted-foreground',
          )}
        >
          {tenant.active ? t('tenants.active') : t('tenants.suspended')}
        </span>
      </div>
    </div>
  )
}

export function TenantsListPage() {
  const { t } = useTranslation('platform')
  const [page, setPage] = useState({ limit: 20, offset: 0 })
  const [createOpen, setCreateOpen] = useState(false)
  const query = useTenants(page)

  const items = query.data?.items ?? []
  const total = query.data?.total ?? 0
  const hasMore = page.offset + items.length < total

  return (
    <div className="mx-auto max-w-[1180px]">
      <PageHeader
        title={t('tenants.title')}
        titleI18n={{ key: 'tenants.title', ns: 'platform' }}
        description={t('tenants.subtitle')}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            {t('tenants.create.title')}
          </Button>
        }
      />

      {query.isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="text-muted-foreground size-6 animate-spin" />
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          title={t('tenants.empty')}
          description={t('tenants.emptyDesc')}
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              {t('tenants.create.title')}
            </Button>
          }
        />
      ) : (
        <>
          <Card className="gap-0 overflow-hidden py-0">
            <div className="overflow-x-auto">
              <div className="min-w-[760px]">
                <div
                  className={cn(
                    'bg-surface-2 text-muted-foreground grid gap-2 border-b px-[18px] py-2.5 text-[11px] font-semibold tracking-[0.04em] uppercase',
                    COLS,
                  )}
                >
                  <div>{t('tenants.columns.name')}</div>
                  <div>{t('tenants.columns.plan')}</div>
                  <div>{t('stats.orgs')}</div>
                  <div>{t('stats.users')}</div>
                  <div>{t('stats.storage')}</div>
                  <div>{t('tenants.columns.status')}</div>
                </div>
                {items.map((tenant) => (
                  <TenantRow key={tenant.id} tenant={tenant} />
                ))}
              </div>
            </div>
          </Card>

          {(page.offset > 0 || hasMore) && (
            <div className="mt-5 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page.offset === 0}
                onClick={() =>
                  setPage((p) => ({ ...p, offset: Math.max(0, p.offset - p.limit) }))
                }
              >
                {t('table.prev', { ns: 'common' })}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!hasMore}
                onClick={() => setPage((p) => ({ ...p, offset: p.offset + p.limit }))}
              >
                {t('table.next', { ns: 'common' })}
              </Button>
            </div>
          )}
        </>
      )}

      <CreateTenantDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
