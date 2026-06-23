import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ChevronLeft, Download, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ErrorState } from '@/components/states'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useDataset, useDatasetVersions, useDeleteDataset } from '@/hooks/use-datasets'
import { useProjectRole } from '@/hooks/use-projects'
import { useToastError } from '@/hooks/use-toast-error'
import { datasetsApi, type DatasetVersion } from '@/api/datasets'
import { roleAtLeast } from '@/lib/roles'
import { CreateDatasetDialog } from './CreateDatasetDialog'
import { DatasetMetaBadges } from './DatasetMetaBadges'
import { DatasetPreviewPanel } from './DatasetPreviewPanel'
import { DatasetVersionsPanel } from './DatasetVersionsPanel'

/** 数据集详情整页（项目壳内的子路由）：预览 / 版本 / 协作。 */
export function DatasetDetailPage() {
  const { t } = useTranslation('datasets')
  const { id: projectId = '', dsId = '' } = useParams()
  const navigate = useNavigate()
  const toastError = useToastError()
  const role = useProjectRole(projectId)
  const canWrite = roleAtLeast(role, 'contributor')
  const canManage = roleAtLeast(role, 'manager')

  const query = useDataset(projectId, dsId)
  const versionsQuery = useDatasetVersions(projectId, dsId)
  const remove = useDeleteDataset(projectId)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const ds = query.data
  // 最新版本（version_no 最大）供 schema/列数/行数。
  const latest = (versionsQuery.data ?? []).reduce<DatasetVersion | undefined>(
    (acc, v) => (!acc || v.version_no > acc.version_no ? v : acc),
    undefined,
  )

  const backLink = (
    <Link
      to={`projects/${projectId}/datasets`}
      className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-muted-foreground hover:text-foreground"
    >
      <ChevronLeft className="size-3.5" />
      {t('title')}
    </Link>
  )

  if (query.isError) {
    return (
      <div className="px-[26px] py-[22px] max-w-[1200px]">
        {backLink}
        <div className="mt-4">
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        </div>
      </div>
    )
  }

  const onExport = (format: 'csv' | 'parquet') =>
    datasetsApi.exportDownload(projectId, dsId, format).catch(toastError)

  const onDelete = async () => {
    if (!ds) return
    try {
      await remove.mutateAsync({ id: ds.id, version: ds.version })
      toast.success(t('toast.deleted'))
      navigate(`projects/${projectId}/datasets`)
    } catch (e) {
      toastError(e)
    }
  }

  const meta = ds
    ? [
        ds.description,
        `v${ds.version}`,
        latest && `${latest.row_count} ${t('preview.rows')}`,
        latest && `${latest.columns.length} ${t('preview.cols')}`,
      ]
        .filter(Boolean)
        .join(' · ')
    : ''

  return (
    <div className="px-[26px] py-[22px] max-w-[1200px]">
      {backLink}

      <div className="mb-5 mt-3 flex flex-wrap items-start gap-x-4 gap-y-3">
        <div className="min-w-0 flex-1">
          {ds ? (
            <h1 className="text-[23px] font-extrabold leading-tight tracking-[-0.01em]">
              {ds.name}
            </h1>
          ) : (
            <Skeleton className="h-7 w-48" />
          )}
          {ds && meta && (
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
              {meta}
            </p>
          )}
          {ds && (
            <div className="mt-2.5">
              <DatasetMetaBadges
                tags={ds.tags}
                author={ds.author}
                references={ds.references}
              />
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => onExport('csv')}>
            <Download className="size-4" />
            {t('preview.exportCsv')}
          </Button>
          <Button onClick={() => onExport('parquet')}>
            <Download className="size-4" />
            {t('preview.exportParquet')}
          </Button>
          {canWrite && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditOpen(true)}>
                  {t('row.edit')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  {t('row.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <Tabs defaultValue="preview">
        <TabsList>
          <TabsTrigger value="preview">{t('tabs.preview')}</TabsTrigger>
          <TabsTrigger value="versions">{t('tabs.versions')}</TabsTrigger>
          {canManage && (
            <TabsTrigger value="collab">{t('links.title')}</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="preview" className="mt-4">
          <DatasetPreviewPanel
            projectId={projectId}
            datasetId={dsId}
            schema={latest?.columns}
          />
        </TabsContent>
        <TabsContent value="versions" className="mt-4">
          <DatasetVersionsPanel
            projectId={projectId}
            datasetId={dsId}
            canManage={canWrite}
          />
        </TabsContent>
        {canManage && (
          <TabsContent value="collab" className="mt-4">
            {/* 资源级协作授权在项目设置统一管理。 */}
            <p className="text-[12.5px] text-muted-foreground">
              {t('collab.managedInSettings')}
            </p>
          </TabsContent>
        )}
      </Tabs>

      {ds && (
        <CreateDatasetDialog
          projectId={projectId}
          open={editOpen}
          onOpenChange={setEditOpen}
          dataset={ds}
        />
      )}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t('delete.title')}
        description={t('delete.description', { name: ds?.name ?? '' })}
        confirmText={t('delete.confirm')}
        destructive
        loading={remove.isPending}
        onConfirm={onDelete}
      />
    </div>
  )
}
