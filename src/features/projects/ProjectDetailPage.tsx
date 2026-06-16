import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Pencil } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState } from '@/components/states'
import { Can } from '@/auth/Can'
import { useProject } from '@/hooks/use-projects'
import { shortId } from '@/lib/format'
import { RegistryTab } from '@/features/registry/RegistryTab'
import { FilesPanel } from '@/features/files/FilesPanel'
import { MembersPanel } from './MembersPanel'
import { CreateProjectDialog } from './CreateProjectDialog'

export function ProjectDetailPage() {
  const { id = '' } = useParams()
  const { t } = useTranslation('projects')
  const navigate = useNavigate()
  const query = useProject(id)
  const [editOpen, setEditOpen] = useState(false)

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }
  if (query.isError) {
    return <ErrorState error={query.error} onRetry={() => query.refetch()} />
  }
  const project = query.data
  if (!project) return <EmptyState title={t('notFound')} />

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/projects')}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">
                {project.name}
              </h1>
              {project.archived && (
                <Badge variant="secondary">{t('status.archived')}</Badge>
              )}
            </div>
            {project.description && (
              <p className="text-muted-foreground text-sm">
                {project.description}
              </p>
            )}
          </div>
        </div>
        <Can perm="project:write">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            {t('row.edit')}
          </Button>
        </Can>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">{t('tabs.overview')}</TabsTrigger>
          <TabsTrigger value="members">{t('tabs.members')}</TabsTrigger>
          <TabsTrigger value="registry">{t('tabs.registry')}</TabsTrigger>
          <TabsTrigger value="files">{t('tabs.files')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="pt-4">
          <dl className="grid max-w-xl grid-cols-[8rem_1fr] gap-y-3 text-sm">
            <dt className="text-muted-foreground">{t('overview.id')}</dt>
            <dd className="font-mono">{shortId(project.id)}</dd>
            <dt className="text-muted-foreground">{t('overview.organization')}</dt>
            <dd className="font-mono">
              {project.organization_id ? shortId(project.organization_id) : t('overview.none')}
            </dd>
            <dt className="text-muted-foreground">{t('overview.status')}</dt>
            <dd>{project.archived ? t('status.archived') : t('status.active')}</dd>
            <dt className="text-muted-foreground">{t('overview.version')}</dt>
            <dd className="tabular-nums">{project.version}</dd>
            <dt className="text-muted-foreground">{t('overview.description')}</dt>
            <dd>{project.description || t('overview.none')}</dd>
          </dl>
        </TabsContent>

        <TabsContent value="members" className="pt-4">
          <MembersPanel projectId={id} />
        </TabsContent>
        <TabsContent value="registry" className="pt-4">
          <RegistryTab projectId={id} />
        </TabsContent>
        <TabsContent value="files" className="pt-4">
          <FilesPanel projectId={id} />
        </TabsContent>
      </Tabs>

      <CreateProjectDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        project={project}
      />
    </div>
  )
}
