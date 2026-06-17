import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus } from 'lucide-react'

import { PageHeader } from '@/components/page-header'
import { DataTable } from '@/components/data-table'
import { EmptyState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Can } from '@/auth/Can'
import { useCan } from '@/auth/auth-context'
import { useOrgs } from '@/hooks/use-orgs'
import type { Organization } from '@/api/orgs'
import { CreateOrgDialog } from './CreateOrgDialog'
import { MyPermissionsCard } from './MyPermissionsCard'

export function OrgsListPage() {
  const { t } = useTranslation('orgs')
  const navigate = useNavigate()
  const canWrite = useCan('org:write')
  const query = useOrgs()
  const [createOpen, setCreateOpen] = useState(false)

  const columns = useMemo<ColumnDef<Organization, unknown>[]>(
    () => [
      {
        accessorKey: 'name',
        header: t('columns.name'),
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
        header: t('columns.slug'),
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.slug}</span>
        ),
      },
    ],
    [t, navigate],
  )

  return (
    <div className="space-y-6">
      <div>
        <PageHeader
          title={t('title')}
          description={t('subtitle')}
          actions={
            <Can perm="org:write">
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" />
                {t('create.title')}
              </Button>
            </Can>
          }
        />
        <DataTable
          columns={columns}
          data={query.data ?? []}
          loading={query.isLoading}
          error={query.isError ? query.error : undefined}
          onRetry={() => query.refetch()}
          empty={
            <EmptyState
              title={t('empty')}
              description={t('emptyDesc')}
              action={
                canWrite ? (
                  <Button onClick={() => setCreateOpen(true)}>
                    <Plus className="size-4" />
                    {t('create.title')}
                  </Button>
                ) : undefined
              }
            />
          }
        />
      </div>

      <MyPermissionsCard />

      <CreateOrgDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
