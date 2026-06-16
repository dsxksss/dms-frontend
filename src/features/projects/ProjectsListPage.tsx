import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { ColumnDef } from '@tanstack/react-table'
import { Archive, ArchiveRestore, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/page-header'
import { DataTable } from '@/components/data-table'
import { EmptyState } from '@/components/states'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Can } from '@/auth/Can'
import { useCan } from '@/auth/auth-context'
import { useDeleteProject, useProjects, useSetArchived } from '@/hooks/use-projects'
import { useToastError } from '@/hooks/use-toast-error'
import { shortId } from '@/lib/format'
import type { Project } from '@/api/projects'
import { CreateProjectDialog } from './CreateProjectDialog'

export function ProjectsListPage() {
  const { t } = useTranslation('projects')
  const navigate = useNavigate()
  const toastError = useToastError()
  const canWrite = useCan('project:write')

  const [includeArchived, setIncludeArchived] = useState(false)
  const [page, setPage] = useState({ limit: 20, offset: 0 })
  const query = useProjects({ include_archived: includeArchived, ...page })

  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Project | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<Project | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)

  const setArchived = useSetArchived()
  const del = useDeleteProject()

  const columns = useMemo<ColumnDef<Project, unknown>[]>(
    () => [
      {
        accessorKey: 'name',
        header: t('columns.name'),
        cell: ({ row }) => (
          <button
            className="hover:text-brand text-left font-medium hover:underline"
            onClick={() => navigate(`/projects/${row.original.id}`)}
          >
            {row.original.name}
          </button>
        ),
      },
      {
        accessorKey: 'organization_id',
        header: t('columns.organization'),
        cell: ({ row }) =>
          row.original.organization_id ? (
            <span className="font-mono text-xs">
              {shortId(row.original.organization_id)}
            </span>
          ) : (
            <span className="text-muted-foreground">-</span>
          ),
      },
      {
        accessorKey: 'archived',
        header: t('columns.status'),
        cell: ({ row }) =>
          row.original.archived ? (
            <Badge variant="secondary">{t('status.archived')}</Badge>
          ) : (
            <Badge className="bg-success/15 text-success border-transparent">
              {t('status.active')}
            </Badge>
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
          const p = row.original
          if (!canWrite) return null
          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditTarget(p)}>
                    <Pencil className="size-4" />
                    {t('row.edit')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setArchiveTarget(p)}>
                    {p.archived ? (
                      <ArchiveRestore className="size-4" />
                    ) : (
                      <Archive className="size-4" />
                    )}
                    {p.archived ? t('row.unarchive') : t('row.archive')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => setDeleteTarget(p)}
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
    [t, navigate, canWrite],
  )

  const onArchiveConfirm = async () => {
    if (!archiveTarget) return
    try {
      await setArchived.mutateAsync({
        id: archiveTarget.id,
        archived: !archiveTarget.archived,
      })
      toast.success(
        archiveTarget.archived ? t('toast.unarchived') : t('toast.archived'),
      )
      setArchiveTarget(null)
    } catch (e) {
      toastError(e)
    }
  }

  const onDeleteConfirm = async () => {
    if (!deleteTarget) return
    try {
      await del.mutateAsync({
        id: deleteTarget.id,
        version: deleteTarget.version,
      })
      toast.success(t('toast.deleted'))
      setDeleteTarget(null)
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
          <Can perm="project:write">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              {t('create.title')}
            </Button>
          </Can>
        }
      />

      <div className="flex items-center gap-2 pb-3">
        <Switch
          id="archived"
          checked={includeArchived}
          onCheckedChange={(v) => {
            setIncludeArchived(v)
            setPage((p) => ({ ...p, offset: 0 }))
          }}
        />
        <Label htmlFor="archived" className="text-muted-foreground text-sm">
          {t('filter.includeArchived')}
        </Label>
      </div>

      <DataTable
        columns={columns}
        data={query.data?.items ?? []}
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
        pagination={{
          limit: page.limit,
          offset: page.offset,
          total: query.data?.total ?? 0,
          onChange: setPage,
        }}
      />

      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
      <CreateProjectDialog
        open={!!editTarget}
        onOpenChange={(o) => !o && setEditTarget(null)}
        project={editTarget}
      />

      <ConfirmDialog
        open={!!archiveTarget}
        onOpenChange={(o) => !o && setArchiveTarget(null)}
        title={
          archiveTarget?.archived ? t('unarchive.title') : t('archive.title')
        }
        description={t(
          archiveTarget?.archived ? 'unarchive.description' : 'archive.description',
          { name: archiveTarget?.name },
        )}
        loading={setArchived.isPending}
        onConfirm={onArchiveConfirm}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={t('delete.title')}
        description={t('delete.description', { name: deleteTarget?.name })}
        confirmText={t('delete.confirm')}
        destructive
        loading={del.isPending}
        onConfirm={onDeleteConfirm}
      />
    </div>
  )
}
