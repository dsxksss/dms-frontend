import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { PageHeader } from '@/components/page-header'
import {
  GridFooter,
  GridHeader,
  GridRow,
  TableCard,
  Th,
} from '@/components/data-grid'
import { Pagination } from '@/components/pagination'
import { EmptyState, ErrorState, TableSkeleton } from '@/components/states'
import { BrandTile } from '@/components/brand-tile'
import { cn } from '@/lib/utils'
import { formatBytes } from '@/lib/format'
import { useSetTenantActive, useTenants } from '@/hooks/use-platform'
import { useToastError } from '@/hooks/use-toast-error'
import type { TenantAdminView } from '@/platform/api'
import { CreateTenantDialog } from './CreateTenantDialog'
import { PlanBadge } from './plan-badge'

const COLS = '1.5fr 120px 90px 90px 110px 140px'

export function TenantsListPage() {
  const { t } = useTranslation('platform')
  const navigate = useNavigate()
  const [createOpen, setCreateOpen] = useState(false)
  const [page, setPage] = useState({ limit: 30, offset: 0 })
  const query = useTenants(page)
  const rows = query.data?.items ?? []
  const hasRows = rows.length > 0

  return (
    <div className="mx-auto max-w-[1180px] px-8 py-7">
      <PageHeader
        title={t('tenants.title')}
        titleEn="Tenants"
        description={t('tenants.subtitle')}
        actions={hasRows ? (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            {t('tenants.create.title')}
          </Button>
        ) : undefined}
      />

      {query.isLoading ? (
        <TableSkeleton rows={6} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          title={t('tenants.empty')}
          hint={t('tenants.emptyDesc')}
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              {t('tenants.create.title')}
            </Button>
          }
        />
      ) : (
        <TableCard>
          <GridHeader cols={COLS}>
            <Th>{t('tenants.columns.name')}</Th>
            <Th>{t('tenants.columns.plan')}</Th>
            <Th>{t('stats.orgs')}</Th>
            <Th>{t('stats.users')}</Th>
            <Th>{t('tenants.usageStorage')}</Th>
            <Th>{t('tenants.columns.status')}</Th>
          </GridHeader>
          {rows.map((tn) => (
            <TenantRow
              key={tn.id}
              tenant={tn}
              onOpen={() => navigate(`/system/tenants/${tn.id}`)}
            />
          ))}
          <GridFooter>
            <span>
              {rows.length} / {query.data?.total ?? rows.length}
            </span>
            <Pagination
              limit={page.limit}
              offset={page.offset}
              total={query.data?.total ?? 0}
              onChange={setPage}
            />
          </GridFooter>
        </TableCard>
      )}

      <CreateTenantDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}

function TenantRow({
  tenant,
  onOpen,
}: {
  tenant: TenantAdminView
  onOpen: () => void
}) {
  const { t } = useTranslation('platform')
  const setActive = useSetTenantActive(tenant.id)
  const toastError = useToastError()

  const toggle = (next: boolean) => {
    setActive
      .mutateAsync(next)
      .then(() =>
        toast.success(
          next ? t('tenants.activatedDone') : t('tenants.suspendedDone'),
        ),
      )
      .catch(toastError)
  }

  return (
    <GridRow cols={COLS} onClick={onOpen}>
      <div className="flex min-w-0 items-center gap-2.5">
        <BrandTile name={tenant.name} seed={tenant.id} size={34} />
        <div className="min-w-0">
          <div className="truncate text-[13px] font-bold">{tenant.name}</div>
          <div className="mono truncate text-[11px] text-muted-foreground">
            @{tenant.slug}
          </div>
        </div>
      </div>
      <div>
        <PlanBadge plan={tenant.plan} />
      </div>
      <div className="mono text-[12.5px]">{tenant.usage.orgs}</div>
      <div className="mono text-[12.5px]">{tenant.usage.users}</div>
      <div className="mono text-[12.5px]">
        {formatBytes(tenant.usage.storage_used)}
      </div>
      <div
        className="flex items-center gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <Switch checked={tenant.active} onCheckedChange={toggle} />
        <span
          className={cn(
            'text-[11.5px] font-semibold',
            tenant.active ? 'text-[#15803D]' : 'text-muted-foreground',
          )}
        >
          {tenant.active ? t('tenants.active') : t('tenants.suspended')}
        </span>
      </div>
    </GridRow>
  )
}
