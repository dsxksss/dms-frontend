import { useTranslation } from 'react-i18next'
import { ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/page-header'
import { StatCard } from '@/components/stat-card'
import { ErrorState } from '@/components/states'
import { Skeleton } from '@/components/ui/skeleton'
import { usePlatformLicense, usePlatformStats } from '@/hooks/use-platform'
import { formatBytes } from '@/lib/format'

export function PlatformOverviewPage() {
  const { t } = useTranslation('platform')
  const stats = usePlatformStats()
  const license = usePlatformLicense()

  return (
    <div className="mx-auto max-w-[1180px] px-8 py-7">
      <PageHeader
        title={t('overview.title')}
        titleEn="Overview"
        description={t('overview.desc')}
      />

      {stats.isError ? (
        <ErrorState error={stats.error} onRetry={() => stats.refetch()} />
      ) : (
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: 'repeat(4,1fr)' }}
        >
          {stats.isLoading || !stats.data ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[104px] rounded-[14px]" />
            ))
          ) : (
            <>
              <StatCard
                label={t('stats.tenants')}
                value={stats.data.tenants.toLocaleString()}
                sub={`${stats.data.active_tenants} ${t('stats.active')} · ${stats.data.suspended_tenants} ${t('stats.suspended')}`}
              />
              <StatCard
                label={t('stats.orgs')}
                value={stats.data.total_orgs.toLocaleString()}
                sub={t('overview.orgsSub')}
              />
              <StatCard
                label={t('stats.users')}
                value={stats.data.total_users.toLocaleString()}
                sub={t('overview.usersSub')}
              />
              <StatCard
                label={t('stats.storage')}
                value={formatBytes(stats.data.total_storage)}
                sub={t('overview.storageSub')}
              />
            </>
          )}
        </div>
      )}

      {/* License 卡片 */}
      {license.isError ? (
        <ErrorState
          className="mt-5"
          error={license.error}
          onRetry={() => license.refetch()}
        />
      ) : (
        <Card className="mt-5 gap-0 p-[18px]">
          <div className="flex items-center gap-2.5">
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-[9px] [&>svg]:size-[18px]"
              style={{ background: '#EFE9FB', color: '#7C3AED' }}
            >
              <ShieldCheck />
            </span>
            <h2 className="text-[15px] font-bold">{t('license.title')}</h2>
            <Badge variant="purple" className="ml-auto">
              {t('license.machineBound')}
            </Badge>
          </div>

          {license.isLoading || !license.data ? (
            <div className="mt-5 grid grid-cols-2 gap-6">
              <Skeleton className="h-12 rounded-lg" />
              <Skeleton className="h-12 rounded-lg" />
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <div className="text-[11.5px] font-semibold text-muted-foreground">
                  {t('license.machine')}
                </div>
                <div className="mono mt-1.5 text-[14px] font-semibold tracking-wide">
                  {license.data.machine_code}
                </div>
              </div>
              <LicenseTenantsBar
                used={license.data.tenants_used}
                max={license.data.max_tenants}
                label={t('license.tenants')}
                unlimited={t('unlimited')}
              />
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

/** 企业数进度条（紫色渐变填充；max=null 表示不限）。 */
function LicenseTenantsBar({
  used,
  max,
  label,
  unlimited,
}: {
  used: number
  max: number | null
  label: string
  unlimited: string
}) {
  const pct = max && max > 0 ? Math.min(100, (used / max) * 100) : 0
  return (
    <div>
      <div className="text-[11.5px] font-semibold text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 h-[9px] max-w-[300px] overflow-hidden rounded-full bg-[#F1F3F7]">
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg,#6D5BD0,#8E7DE8)',
          }}
        />
      </div>
      <div className="mono mt-1.5 text-[12px] font-bold">
        {used} / {max ?? unlimited}
      </div>
    </div>
  )
}
