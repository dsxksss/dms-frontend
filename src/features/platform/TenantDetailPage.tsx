import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ErrorState, TableSkeleton } from '@/components/states'
import { BrandTile } from '@/components/brand-tile'
import { StatCard } from '@/components/stat-card'
import { useTenantDetail } from '@/hooks/use-platform'
import { formatBytes } from '@/lib/format'
import type { TenantAdminView } from '@/platform/api'
import { PlanBadge } from './plan-badge'
import { TenantSettingsCard } from './TenantSettingsCard'

export function TenantDetailPage() {
  const { t } = useTranslation('platform')
  const { id = '' } = useParams()
  const query = useTenantDetail(id)
  const tenant = query.data

  return (
    <div className="mx-auto max-w-[1180px] px-8 py-7">
      <Link
        to="/system/tenants"
        className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        {t('tenants.back')}
      </Link>

      {query.isLoading ? (
        <TableSkeleton rows={5} />
      ) : query.isError || !tenant ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <TenantDetailBody tenant={tenant} />
      )}
    </div>
  )
}

function TenantDetailBody({ tenant }: { tenant: TenantAdminView }) {
  const { t } = useTranslation('platform')
  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <BrandTile name={tenant.name} seed={tenant.id} size={46} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[23px] font-extrabold tracking-[-0.01em]">
              {tenant.name}
            </h1>
            <PlanBadge plan={tenant.plan} />
            <Badge variant={tenant.active ? 'success' : 'neutral'}>
              {tenant.active ? t('tenants.active') : t('tenants.suspended')}
            </Badge>
          </div>
          <div className="mono mt-0.5 text-[12px] text-muted-foreground">
            @{tenant.slug}
          </div>
        </div>
      </div>

      {/* 用量 */}
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: 'repeat(3,1fr)' }}
      >
        <StatCard label={t('tenants.usageOrgs')} value={tenant.usage.orgs} />
        <StatCard label={t('tenants.usageUsers')} value={tenant.usage.users} />
        <StatCard
          label={t('tenants.usageStorage')}
          value={formatBytes(tenant.usage.storage_used)}
        />
      </div>

      <div className="mt-5">
        <TenantSettingsCard tenant={tenant} />
      </div>
    </>
  )
}
