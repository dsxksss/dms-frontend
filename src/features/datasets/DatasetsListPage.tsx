import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { ColumnDef } from '@tanstack/react-table'
import { Globe, Lock, MoreHorizontal, Pencil, Plus, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/page-header'
import { DataTable } from '@/components/data-table'
import { EmptyState } from '@/components/states'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Can } from '@/auth/Can'
import { useAuth, useCan } from '@/auth/auth-context'
import { useDatasets, useDeleteDataset } from '@/hooks/use-datasets'
import { useToastError } from '@/hooks/use-toast-error'
import { shortId } from '@/lib/format'
import type { Dataset, Visibility } from '@/api/datasets'
import { CreateDatasetDialog } from './CreateDatasetDialog'

const VIS_ICON = { private: Lock, org: Users, public: Globe } as const

export function DatasetsListPage() {
  const { t } = useTranslation('datasets')
  const navigate = useNavigate()
  const { me } = useAuth()
  const canWrite = useCan('dataset:write')
  const toastError = useToastError()
  const query = useDatasets()
  const del = useDeleteDataset()

  const [editTarget, setEditTarget] = useState<Dataset | null>(null)
  const [delTarget, setDelTarget] = useState<Dataset | null>(null)

  const columns = useMemo<ColumnDef<Dataset, unknown>[]>(
    () => [
      {
        accessorKey: 'name',
        header: t('columns.name'),
        cell: ({ row }) => (
          <button
            className="hover:text-brand text-left font-medium hover:underline"
            onClick={() => navigate(`/datasets/${row.original.id}`)}
          >
            {row.original.name}
          </button>
        ),
      },
      {
        accessorKey: 'visibility',
        header: t('columns.visibility'),
        cell: ({ row }) => {
          const v = row.original.visibility as Visibility
          const Icon = VIS_ICON[v]
          return (
            <Badge variant="secondary" className="gap-1">
              <Icon className="size-3" />
              {t(`visibility.${v}`)}
            </Badge>
          )
        },
      },
      {
        accessorKey: 'owner_id',
        header: t('columns.owner'),
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {shortId(row.original.owner_id)}
            {me?.user_id === row.original.owner_id && (
              <span className="text-muted-foreground ml-1">{t('you')}</span>
            )}
          </span>
        ),
      },
      {
        accessorKey: 'version',
        header: t('columns.version'),
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.version}</span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const d = row.original
          const isOwner = me?.user_id === d.owner_id
          if (!canWrite || !isOwner) return null
          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditTarget(d)}>
                    <Pencil className="size-4" />
                    {t('row.edit')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => setDelTarget(d)}
                  >
                    <Trash2 className="size-4" />
                    {t('row.delete')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ],
    [t, navigate, canWrite, me],
  )

  const [createOpen, setCreateOpen] = useState(false)

  const onDelete = async () => {
    if (!delTarget) return
    try {
      await del.mutateAsync({ id: delTarget.id, version: delTarget.version })
      toast.success(t('toast.deleted'))
      setDelTarget(null)
    } catch (e) {
      toastError(e)
    }
  }

  return (
    <div>
      <PageHeader
        title={t('title')}
        description={t('subtitle')}
        actions={
          <Can perm="dataset:write">
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
            title={t('empty.title')}
            description={t('empty.description')}
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

      <CreateDatasetDialog open={createOpen} onOpenChange={setCreateOpen} />
      <CreateDatasetDialog
        open={!!editTarget}
        onOpenChange={(o) => !o && setEditTarget(null)}
        dataset={editTarget}
      />

      <ConfirmDialog
        open={!!delTarget}
        onOpenChange={(o) => !o && setDelTarget(null)}
        title={t('delete.title')}
        description={t('delete.description', { name: delTarget?.name })}
        confirmText={t('delete.confirm')}
        destructive
        loading={del.isPending}
        onConfirm={onDelete}
      />
    </div>
  )
}
