import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState } from '@/components/states'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useDataset, useDeleteDataset } from '@/hooks/use-datasets'
import { useProjectRole } from '@/hooks/use-projects'
import { roleAtLeast } from '@/lib/roles'
import { useToastError } from '@/hooks/use-toast-error'
import { shortId } from '@/lib/format'
import { ResourceGrantsPanel } from '@/features/grants/ResourceGrantsPanel'
import { CreateDatasetDialog } from './CreateDatasetDialog'
import { DatasetVersionsPanel } from './DatasetVersionsPanel'
import { DatasetPreviewPanel } from './DatasetPreviewPanel'

export function DatasetDetailPage() {
  const { id: projectId = '', dsId = '' } = useParams()
  const { t } = useTranslation('datasets')
  const navigate = useNavigate()
  const role = useProjectRole(projectId)
  const canManage = roleAtLeast(role, 'contributor')
  const canGrant = roleAtLeast(role, 'manager')
  const query = useDataset(projectId, dsId)
  const del = useDeleteDataset(projectId)
  const toastError = useToastError()
  const [editOpen, setEditOpen] = useState(false)
  const [delOpen, setDelOpen] = useState(false)

  const backToProject = () => navigate(`/projects/${projectId}`)

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
  const dataset = query.data
  if (!dataset) return <EmptyState title={t('empty.title')} />

  const onDelete = async () => {
    try {
      await del.mutateAsync({ id: dataset.id, version: dataset.version })
      toast.success(t('toast.deleted'))
      backToProject()
    } catch (e) {
      toastError(e)
    }
  }

  return (
    <div className="mx-auto max-w-[1200px]">
      <button
        onClick={backToProject}
        className="text-muted-foreground hover:text-foreground mb-1.5 inline-flex items-center gap-1 text-[12.5px]"
      >
        <ArrowLeft className="size-3.5" />
        {t('title')}
      </button>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 space-y-1.5">
          <h1 className="text-[22px] font-extrabold tracking-tight">
            {dataset.name}
          </h1>
          <p className="text-muted-foreground text-[12.5px]">
            {dataset.description ? `${dataset.description} · ` : ''}v
            {dataset.version}
          </p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" />
              {t('row.edit')}
            </Button>
            <Button variant="outline" size="icon" onClick={() => setDelOpen(true)}>
              <Trash2 className="text-destructive size-4" />
            </Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="versions" className="gap-4">
        <TabsList>
          <TabsTrigger value="overview">{t('tabs.overview')}</TabsTrigger>
          <TabsTrigger value="versions">{t('tabs.versions')}</TabsTrigger>
          <TabsTrigger value="preview">{t('tabs.preview')}</TabsTrigger>
          {canGrant && (
            <TabsTrigger value="collab">
              {t('resourceGrants.title', { ns: 'common' })}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="pt-4">
          <dl className="grid max-w-xl grid-cols-[8rem_1fr] gap-y-3 text-sm">
            <dt className="text-muted-foreground">{t('overview.id')}</dt>
            <dd className="font-mono">{shortId(dataset.id)}</dd>
            <dt className="text-muted-foreground">{t('overview.version')}</dt>
            <dd className="tabular-nums">{dataset.version}</dd>
            <dt className="text-muted-foreground">{t('overview.description')}</dt>
            <dd>{dataset.description || t('overview.none')}</dd>
          </dl>
        </TabsContent>

        <TabsContent value="versions" className="pt-4">
          <DatasetVersionsPanel
            projectId={projectId}
            datasetId={dsId}
            canManage={canManage}
          />
        </TabsContent>
        <TabsContent value="preview" className="pt-4">
          <DatasetPreviewPanel projectId={projectId} datasetId={dsId} />
        </TabsContent>
        {canGrant && (
          <TabsContent value="collab" className="pt-4">
            <ResourceGrantsPanel resourceType="dataset" resourceId={dsId} />
          </TabsContent>
        )}
      </Tabs>

      <CreateDatasetDialog
        projectId={projectId}
        open={editOpen}
        onOpenChange={setEditOpen}
        dataset={dataset}
      />
      <ConfirmDialog
        open={delOpen}
        onOpenChange={setDelOpen}
        title={t('delete.title')}
        description={t('delete.description', { name: dataset.name })}
        confirmText={t('delete.confirm')}
        destructive
        loading={del.isPending}
        onConfirm={onDelete}
      />
    </div>
  )
}
