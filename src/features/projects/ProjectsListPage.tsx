import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Archive, ArchiveRestore, FolderOpen, Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { PageHeader } from '@/components/page-header'
import { BrandTile } from '@/components/brand-tile'
import { EmptyState, ErrorState, GridSkeleton } from '@/components/states'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { roleTone } from '@/components/tone'
import {
  useProjects,
  useProjectRole,
  useMembers,
  useSetArchived,
  useDeleteProject,
} from '@/hooks/use-projects'
import { useDatasets } from '@/hooks/use-datasets'
import { useOrgs } from '@/hooks/use-orgs'
import { useToastError } from '@/hooks/use-toast-error'
import { roleAtLeast } from '@/lib/roles'
import { cn } from '@/lib/utils'
import type { Project } from '@/api/projects'
import { CreateProjectDialog } from './CreateProjectDialog'
import { GettingStarted } from '@/features/onboarding/GettingStarted'

export function ProjectsListPage() {
  const { t } = useTranslation('projects')
  const [includeArchived, setIncludeArchived] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const query = useProjects({ include_archived: includeArchived })
  const orgs = useOrgs()
  const orgName = useMemo(
    () => new Map((orgs.data ?? []).map((o) => [o.id, o.name])),
    [orgs.data],
  )
  const projects = query.data?.items ?? []

  return (
    <div className="mx-auto max-w-[1180px] px-8 py-7">
      <PageHeader
        title={t('title')}
        titleEn="Projects"
        description={t('subtitle')}
        actions={
          <>
            <Button
              variant={includeArchived ? 'default' : 'outline'}
              onClick={() => setIncludeArchived((v) => !v)}
            >
              {t('filter.includeArchived')}
            </Button>
            <Button onClick={() => setCreateOpen(true)} data-tour="new-project">
              <Plus className="size-4" />
              {t('create.title')}
            </Button>
          </>
        }
      />

      {query.data && (
        <GettingStarted
          hasProject={projects.length > 0}
          onCreateProject={() => setCreateOpen(true)}
        />
      )}

      {query.isLoading ? (
        <GridSkeleton count={6} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : projects.length === 0 ? (
        <EmptyState
          title={t('empty.title')}
          hint={t('empty.description')}
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              {t('create.title')}
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              orgName={p.organization_id ? orgName.get(p.organization_id) : undefined}
            />
          ))}
        </div>
      )}

      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}

function ProjectCard({
  project,
  orgName,
}: {
  project: Project
  orgName?: string
}) {
  const { t } = useTranslation('projects')
  const navigate = useNavigate()
  const role = useProjectRole(project.id)
  const members = useMembers(project.id)
  const datasets = useDatasets(project.id)
  const setArchived = useSetArchived()
  const del = useDeleteProject()
  const toastError = useToastError()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const canOwn = roleAtLeast(role, 'owner')

  const sub = orgName ?? t('card.defaultWorkspace')

  const onArchive = () =>
    setArchived
      .mutateAsync({ id: project.id, archived: !project.archived })
      .then(() =>
        toast.success(t(project.archived ? 'toast.unarchived' : 'toast.archived')),
      )
      .catch(toastError)
  const onDelete = () =>
    del
      .mutateAsync({ id: project.id, version: project.version })
      .then(() => {
        toast.success(t('toast.deleted'))
        setDeleteOpen(false)
      })
      .catch(toastError)

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          type="button"
          onClick={() => navigate(`/projects/${project.id}`)}
          className={cn(
            'card-shadow group rounded-[14px] border bg-card p-[18px] text-left transition',
            'hover:border-brand/40 hover:shadow-[0_6px_20px_rgba(20,40,80,0.08)]',
          )}
        >
          <div className="mb-3 flex items-center gap-2.5">
        <BrandTile name={project.name} seed={project.id} size={38} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-bold">{project.name}</div>
          <div className="truncate text-[11.5px] text-muted-foreground">{sub}</div>
        </div>
        {role && <Badge variant={roleTone(role)}>{t(`roles.${role}`)}</Badge>}
      </div>
      <div className="line-clamp-2 h-[38px] text-[12.5px] leading-relaxed text-[#5a6473]">
        {project.description || '—'}
      </div>
      <div className="mt-3 flex items-center gap-4 border-t border-divider pt-3 text-[12px] text-muted-foreground">
        <span>
          <b className="text-foreground">{datasets.data?.length ?? '·'}</b>{' '}
          {t('tabs.datasets')}
        </span>
        <span>
          <b className="text-foreground">{members.data?.length ?? '·'}</b>{' '}
          {t('members.title')}
        </span>
        {project.archived && (
          <Badge variant="neutral" className="ml-auto">
            {t('status.archived')}
          </Badge>
        )}
          </div>
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => navigate(`/projects/${project.id}`)}>
          <FolderOpen />
          {t('row.open')}
        </ContextMenuItem>
        {canOwn && (
          <ContextMenuItem onClick={onArchive}>
            {project.archived ? <ArchiveRestore /> : <Archive />}
            {t(project.archived ? 'row.unarchive' : 'row.archive')}
          </ContextMenuItem>
        )}
        {canOwn && <ContextMenuSeparator />}
        {canOwn && (
          <ContextMenuItem
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 />
            {t('row.delete')}
          </ContextMenuItem>
        )}
      </ContextMenuContent>
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t('delete.title')}
        description={t('delete.description', { name: project.name })}
        confirmText={t('delete.confirm')}
        destructive
        loading={del.isPending}
        onConfirm={onDelete}
      />
    </ContextMenu>
  )
}
