import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ShieldCheck } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { ErrorState } from '@/components/states'
import { usePlatformStats, usePlatformLicense } from '@/hooks/use-platform'
import { formatBytes } from '@/lib/format'

function StatCard({
  label,
  value,
  sub,
  loading,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  loading?: boolean
}) {
  return (
    <Card className="gap-0 px-5 py-[18px]">
      <p className="text-muted-foreground text-[12.5px] font-semibold">{label}</p>
      {loading ? (
        <Skeleton className="mt-2 h-8 w-20" />
      ) : (
        <p className="mt-2 text-[30px] font-extrabold tracking-tight tabular-nums">
          {value}
        </p>
      )}
      {sub && <p className="text-muted-foreground mt-0.5 text-[11.5px]">{sub}</p>}
    </Card>
  )
}

export function PlatformOverviewPage() {
  const { t } = useTranslation('platform')
  const stats = usePlatformStats()
  const license = usePlatformLicense()

  const used = license.data?.tenants_used ?? 0
  const max = license.data?.max_tenants
  const pct = max && max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0

  return (
    <div className="mx-auto max-w-[1180px] space-y-[18px]">
      <PageHeader
        title={t('overview.title')}
        titleI18n={{ key: 'overview.title', ns: 'platform' }}
        description={t('overview.desc')}
      />

      {stats.isError ? (
        <ErrorState error={stats.error} onRetry={() => stats.refetch()} />
      ) : (
        <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          <StatCard
            label={t('stats.tenants')}
            value={stats.data?.tenants ?? 0}
            sub={
              stats.data
                ? `${stats.data.active_tenants} ${t('stats.active')} · ${stats.data.suspended_tenants} ${t('stats.suspended')}`
                : undefined
            }
            loading={stats.isLoading}
          />
          <StatCard
            label={t('stats.orgs')}
            value={stats.data?.total_orgs ?? 0}
            loading={stats.isLoading}
          />
          <StatCard
            label={t('stats.users')}
            value={stats.data?.total_users ?? 0}
            loading={stats.isLoading}
          />
          <StatCard
            label={t('stats.storage')}
            value={formatBytes(stats.data?.total_storage ?? 0)}
            loading={stats.isLoading}
          />
        </div>
      )}

      <Card className="gap-0 px-[22px] py-5">
        <div className="mb-4 flex items-center gap-2.5">
          <ShieldCheck className="size-[18px] text-[#7C3AED]" />
          <span className="text-[15px] font-bold">{t('license.title')}</span>
          {license.data && (
            <Badge variant="purple" className="ml-auto">
              {license.data.license_pubkey_baked
                ? t('license.baked')
                : t('license.unbaked')}
            </Badge>
          )}
        </div>

        {license.isError ? (
          <ErrorState error={license.error} onRetry={() => license.refetch()} />
        ) : license.isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <div className="flex flex-col gap-6 sm:flex-row">
            <div>
              <div className="text-muted-foreground text-[11.5px]">
                {t('license.machine')}
              </div>
              <div className="mt-1 font-mono text-[13px] font-semibold">
                {license.data?.machine_code ?? '-'}
              </div>
            </div>
            <div className="flex-1">
              <div className="text-muted-foreground text-[11.5px]">
                {t('license.tenants')}
              </div>
              <div className="mt-1.5 flex items-center gap-2.5">
                <div className="bg-muted h-[9px] max-w-[300px] flex-1 overflow-hidden rounded-full">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#6D5BD0,#8E7DE8)]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="font-mono text-[13px] font-bold tabular-nums">
                  {used} / {max == null ? t('unlimited') : max}
                </span>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
