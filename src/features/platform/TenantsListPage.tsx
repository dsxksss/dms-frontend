import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus } from 'lucide-react'

import { PageHeader } from '@/components/page-header'
import { DataTable } from '@/components/data-table'
import { EmptyState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useTenants } from '@/hooks/use-platform'
import { formatBytes, formatDateTime } from '@/lib/format'
import type { TenantAdminView } from '@/platform/api'
import { PlanBadge } from './plan-badge'
import { CreateTenantDialog } from './CreateTenantDialog'

export function TenantsListPage() {
  const { t } = useTranslation('platform')
  const navigate = useNavigate()
  const [page, setPage] = useState({ limit: 20, offset: 0 })
  const [createOpen, setCreateOpen] = useState(false)
  const query = useTenants(page)

  const columns = useMemo<ColumnDef<TenantAdminView, unknown>[]>(
    () => [
      {
        accessorKey: 'name',
        header: t('tenants.columns.name'),
        cell: ({ row }) => (
          <button
            className="hover:text-brand text-left font-medium hover:underline"
            onClick={() => navigate(row.original.id)}
          >
            {row.original.name}
          </button>
        ),
      },
      {
        accessorKey: 'slug',
        header: t('tenants.columns.slug'),
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.slug}</span>
        ),
      },
      {
        accessorKey: 'plan',
        header: t('tenants.columns.plan'),
        cell: ({ row }) => <PlanBadge plan={row.original.plan} />,
      },
      {
        id: 'usage',
        header: t('tenants.columns.usage'),
        cell: ({ row }) => {
          const u = row.original.usage
          return (
            <span className="text-muted-foreground text-xs tabular-nums">
              {t('tenants.usageSummary', {
                orgs: u.orgs,
                users: u.users,
                storage: formatBytes(u.storage_used),
              })}
            </span>
          )
        },
      },
      {
        accessorKey: 'active',
        header: t('tenants.columns.status'),
        cell: ({ row }) =>
          row.original.active ? (
            <Badge
              variant="outline"
              className="border-transparent bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            >
              {t('tenants.active')}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              {t('tenants.suspended')}
            </Badge>
          ),
      },
      {
        accessorKey: 'created_at',
        header: t('tenants.columns.created'),
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs">
            {formatDateTime(row.original.created_at)}
          </span>
        ),
      },
    ],
    [t, navigate],
  )

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('tenants.title')}
        description={t('tenants.subtitle')}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            {t('tenants.create.title')}
          </Button>
        }
      />
      <DataTable
        columns={columns}
        data={query.data?.items ?? []}
        loading={query.isLoading}
        error={query.isError ? query.error : undefined}
        onRetry={() => query.refetch()}
        empty={
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
        }
        pagination={{
          limit: page.limit,
          offset: page.offset,
          total: query.data?.total ?? 0,
          onChange: setPage,
        }}
      />

      <CreateTenantDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
