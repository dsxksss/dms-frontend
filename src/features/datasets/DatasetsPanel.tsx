import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { DataTable } from '@/components/data-table'
import { EmptyState } from '@/components/states'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useDatasets, useDeleteDataset } from '@/hooks/use-datasets'
import { useProjectRole } from '@/hooks/use-projects'
import { roleAtLeast } from '@/lib/roles'
import { useToastError } from '@/hooks/use-toast-error'
import type { Dataset } from '@/api/datasets'
import { CreateDatasetDialog } from './CreateDatasetDialog'

/** 项目内数据集列表（项目成员可见，Contributor+ 可写）。 */
export function DatasetsPanel({ projectId }: { projectId: string }) {
  const { t } = useTranslation('datasets')
  const navigate = useNavigate()
  const role = useProjectRole(projectId)
  const canWrite = roleAtLeast(role, 'contributor')
  const toastError = useToastError()
  const query = useDatasets(projectId)
  const del = useDeleteDataset(projectId)

  const [createOpen, setCreateOpen] = useState(false)
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
            onClick={() =>
              navigate(`/projects/${projectId}/datasets/${row.original.id}`)
            }
          >
            {row.original.name}
          </button>
        ),
      },
      {
        accessorKey: 'description',
        header: t('columns.description'),
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {row.original.description || '—'}
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
          if (!canWrite) return null
          const d = row.original
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
    [t, navigate, projectId, canWrite],
  )

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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">{t('title')}</h2>
        {canWrite && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            {t('create.title')}
          </Button>
        )}
      </div>

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

      <CreateDatasetDialog
        projectId={projectId}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
      <CreateDatasetDialog
        projectId={projectId}
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
