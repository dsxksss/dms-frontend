import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Building2,
  CheckCircle2,
  HardDrive,
  PauseCircle,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { ErrorState } from '@/components/states'
import { usePlatformStats, usePlatformLicense } from '@/hooks/use-platform'
import { formatBytes } from '@/lib/format'

function StatCard({
  icon,
  label,
  value,
  loading,
}: {
  icon: ReactNode
  label: string
  value: ReactNode
  loading?: boolean
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <div className="bg-muted text-muted-foreground flex size-9 items-center justify-center rounded-md">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs">{label}</p>
          {loading ? (
            <Skeleton className="mt-1 h-6 w-16" />
          ) : (
            <p className="text-lg font-semibold tabular-nums">{value}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function PlatformOverviewPage() {
  const { t } = useTranslation('platform')
  const stats = usePlatformStats()
  const license = usePlatformLicense()

  return (
    <div className="space-y-6">
      <PageHeader title={t('overview.title')} description={t('overview.desc')} />

      {stats.isError ? (
        <ErrorState error={stats.error} onRetry={() => stats.refetch()} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            icon={<Building2 className="size-4" />}
            label={t('stats.tenants')}
            value={stats.data?.tenants ?? 0}
            loading={stats.isLoading}
          />
          <StatCard
            icon={<CheckCircle2 className="size-4" />}
            label={t('stats.active')}
            value={stats.data?.active_tenants ?? 0}
            loading={stats.isLoading}
          />
          <StatCard
            icon={<PauseCircle className="size-4" />}
            label={t('stats.suspended')}
            value={stats.data?.suspended_tenants ?? 0}
            loading={stats.isLoading}
          />
          <StatCard
            icon={<Building2 className="size-4" />}
            label={t('stats.orgs')}
            value={stats.data?.total_orgs ?? 0}
            loading={stats.isLoading}
          />
          <StatCard
            icon={<Users className="size-4" />}
            label={t('stats.users')}
            value={stats.data?.total_users ?? 0}
            loading={stats.isLoading}
          />
          <StatCard
            icon={<HardDrive className="size-4" />}
            label={t('stats.storage')}
            value={formatBytes(stats.data?.total_storage ?? 0)}
            loading={stats.isLoading}
          />
        </div>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="text-muted-foreground size-4" />
            {t('license.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {license.isError ? (
            <ErrorState error={license.error} onRetry={() => license.refetch()} />
          ) : license.isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">{t('license.tenants')}</dt>
                <dd className="font-medium tabular-nums">
                  {license.data?.tenants_used ?? 0}
                  {' / '}
                  {license.data?.max_tenants == null
                    ? t('unlimited')
                    : license.data.max_tenants}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">{t('license.signed')}</dt>
                <dd>
                  <Badge
                    variant="outline"
                    className={
                      license.data?.license_pubkey_baked
                        ? 'border-transparent bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'text-muted-foreground'
                    }
                  >
                    {license.data?.license_pubkey_baked
                      ? t('license.baked')
                      : t('license.unbaked')}
                  </Badge>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 sm:col-span-2">
                <dt className="text-muted-foreground">{t('license.machine')}</dt>
                <dd className="truncate font-mono text-xs">
                  {license.data?.machine_code ?? '-'}
                </dd>
              </div>
            </dl>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
