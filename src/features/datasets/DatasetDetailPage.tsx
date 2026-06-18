import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Download, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EmptyState, ErrorState } from '@/components/states'
import { ConfirmDialog } from '@/components/confirm-dialog'
import {
  useDataset,
  useDatasetVersions,
  useDeleteDataset,
} from '@/hooks/use-datasets'
import { useProjectRole } from '@/hooks/use-projects'
import { roleAtLeast } from '@/lib/roles'
import { useToastError } from '@/hooks/use-toast-error'
import { ResourceGrantsPanel } from '@/features/grants/ResourceGrantsPanel'
import { datasetsApi } from '@/api/datasets'
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
  const versions = useDatasetVersions(projectId, dsId)
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

  // 最新版本（最大 version_no）：用于表头列模式 + 元信息（v / 行 / 列）。
  const current = [...(versions.data ?? [])].sort(
    (a, b) => b.version_no - a.version_no,
  )[0]

  const metaParts = [
    dataset.description || null,
    current ? `v${current.version_no}` : null,
    current ? `${current.row_count.toLocaleString()} ${t('preview.rows')}` : null,
    current ? `${current.columns.length} ${t('preview.cols')}` : null,
  ].filter(Boolean)

  const doExport = async (format: 'csv' | 'parquet') => {
    try {
      await datasetsApi.exportDownload(projectId, dsId, format)
    } catch (e) {
      toastError(e)
    }
  }

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
            {metaParts.join(' · ')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => doExport('csv')}>
            <Download className="size-4" />
            {t('preview.exportCsv')}
          </Button>
          <Button onClick={() => doExport('parquet')}>
            <Download className="size-4" />
            {t('preview.exportParquet')}
          </Button>
          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditOpen(true)}>
                  <Pencil className="size-4" />
                  {t('row.edit')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => setDelOpen(true)}
                >
                  <Trash2 className="size-4" />
                  {t('row.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <Tabs defaultValue="preview" className="gap-4">
        <TabsList>
          <TabsTrigger value="preview">{t('tabs.preview')}</TabsTrigger>
          <TabsTrigger value="versions">{t('tabs.versions')}</TabsTrigger>
          {canGrant && (
            <TabsTrigger value="collab">
              {t('resourceGrants.title', { ns: 'common' })}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="preview">
          <DatasetPreviewPanel
            projectId={projectId}
            datasetId={dsId}
            schema={current?.columns}
          />
        </TabsContent>
        <TabsContent value="versions">
          <DatasetVersionsPanel
            projectId={projectId}
            datasetId={dsId}
            canManage={canManage}
          />
        </TabsContent>
        {canGrant && (
          <TabsContent value="collab">
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
