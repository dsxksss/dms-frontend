import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Archive,
  ArchiveRestore,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/page-header'
import { EmptyState, ErrorState } from '@/components/states'
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
import { useCan } from '@/auth/auth-context'
import { useDeleteProject, useProjects, useSetArchived } from '@/hooks/use-projects'
import { useToastError } from '@/hooks/use-toast-error'
import { codeOf, tintOf } from '@/lib/tile'
import { cn } from '@/lib/utils'
import type { Project } from '@/api/projects'
import { CreateProjectDialog } from './CreateProjectDialog'

function ProjectCard({
  project,
  canWrite,
  onOpen,
  onEdit,
  onArchive,
  onDelete,
}: {
  project: Project
  canWrite: boolean
  onOpen: () => void
  onEdit: () => void
  onArchive: () => void
  onDelete: () => void
}) {
  const { t } = useTranslation('projects')
  const tint = tintOf(project.id)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
      className="group bg-card hover:border-brand/40 cursor-pointer rounded-[14px] border p-[18px] shadow-[0_1px_2px_rgba(20,40,80,0.04)] transition-all outline-none hover:shadow-[0_8px_24px_rgba(20,40,80,0.08)] focus-visible:ring-[3px] focus-visible:ring-primary/20"
    >
      <div className="mb-3 flex items-center gap-3">
        <span
          className="flex size-[38px] shrink-0 items-center justify-center rounded-[10px] text-[13px] font-extrabold"
          style={{ background: tint.bg, color: tint.fg }}
        >
          {codeOf(project.name)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-bold">{project.name}</div>
          <div className="text-muted-foreground truncate text-[11.5px]">
            {project.organization_id
              ? t('card.orgProject')
              : t('card.personalProject')}
          </div>
        </div>
        <Badge variant={project.archived ? 'neutral' : 'success'}>
          {t(project.archived ? 'status.archived' : 'status.active')}
        </Badge>
        {canWrite && (
          <span onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="-mr-1">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="size-4" />
                  {t('row.edit')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onArchive}>
                  {project.archived ? (
                    <ArchiveRestore className="size-4" />
                  ) : (
                    <Archive className="size-4" />
                  )}
                  {t(project.archived ? 'row.unarchive' : 'row.archive')}
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                  <Trash2 className="size-4" />
                  {t('row.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </span>
        )}
      </div>
      <p className="line-clamp-2 min-h-[38px] text-[12.5px] leading-[1.5] text-[#5a6473]">
        {project.description || '—'}
      </p>
      <div className="text-muted-foreground border-divider mt-3 flex items-center gap-3 border-t pt-3 text-[12px]">
        <span className="font-mono tabular-nums">v{project.version}</span>
        <span className="text-brand ml-auto font-semibold opacity-0 transition-opacity group-hover:opacity-100">
          {t('card.open')} →
        </span>
      </div>
    </div>
  )
}

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

  const items = query.data?.items ?? []

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

  const total = query.data?.total ?? 0
  const hasMore = page.offset + items.length < total

  return (
    <div className="mx-auto max-w-[1180px]">
      <PageHeader
        title={t('title')}
        titleI18n={{ key: 'title', ns: 'projects' }}
        description={t('subtitle')}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setIncludeArchived((v) => !v)
                setPage((p) => ({ ...p, offset: 0 }))
              }}
              className={cn(
                includeArchived &&
                  'border-accent bg-accent text-accent-foreground',
              )}
            >
              {t('filter.includeArchived')}
            </Button>
            <Can perm="project:write">
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" />
                {t('create.title')}
              </Button>
            </Can>
          </>
        }
      />

      {query.isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="text-muted-foreground size-6 animate-spin" />
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : items.length === 0 ? (
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
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                canWrite={canWrite}
                onOpen={() => navigate(`/projects/${p.id}`)}
                onEdit={() => setEditTarget(p)}
                onArchive={() => setArchiveTarget(p)}
                onDelete={() => setDeleteTarget(p)}
              />
            ))}
          </div>
          {(page.offset > 0 || hasMore) && (
            <div className="mt-5 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page.offset === 0}
                onClick={() =>
                  setPage((p) => ({
                    ...p,
                    offset: Math.max(0, p.offset - p.limit),
                  }))
                }
              >
                {t('table.prev', { ns: 'common' })}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!hasMore}
                onClick={() =>
                  setPage((p) => ({ ...p, offset: p.offset + p.limit }))
                }
              >
                {t('table.next', { ns: 'common' })}
              </Button>
            </div>
          )}
        </>
      )}

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
