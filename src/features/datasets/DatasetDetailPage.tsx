import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Globe, Lock, Pencil, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState } from '@/components/states'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useAuth, useCan } from '@/auth/auth-context'
import { useDataset, useDeleteDataset } from '@/hooks/use-datasets'
import { useToastError } from '@/hooks/use-toast-error'
import { shortId } from '@/lib/format'
import type { Visibility } from '@/api/datasets'
import { CreateDatasetDialog } from './CreateDatasetDialog'
import { DatasetVersionsPanel } from './DatasetVersionsPanel'
import { DatasetPreviewPanel } from './DatasetPreviewPanel'
import { DatasetLinksPanel } from './DatasetLinksPanel'

const VIS_ICON = { private: Lock, org: Users, public: Globe } as const

export function DatasetDetailPage() {
  const { id = '' } = useParams()
  const { t } = useTranslation('datasets')
  const navigate = useNavigate()
  const { me } = useAuth()
  const canWrite = useCan('dataset:write')
  const query = useDataset(id)
  const del = useDeleteDataset()
  const toastError = useToastError()
  const [editOpen, setEditOpen] = useState(false)
  const [delOpen, setDelOpen] = useState(false)

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

  const isOwner = me?.user_id === dataset.owner_id
  const canManage = canWrite && isOwner
  const Vis = VIS_ICON[dataset.visibility as Visibility]

  const onDelete = async () => {
    try {
      await del.mutateAsync({ id: dataset.id, version: dataset.version })
      toast.success(t('toast.deleted'))
      navigate('/datasets')
    } catch (e) {
      toastError(e)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/datasets')}>
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">
                {dataset.name}
              </h1>
              <Badge variant="secondary" className="gap-1">
                <Vis className="size-3" />
                {t(`visibility.${dataset.visibility}`)}
              </Badge>
            </div>
            {dataset.description && (
              <p className="text-muted-foreground text-sm">{dataset.description}</p>
            )}
          </div>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" />
              {t('row.edit')}
            </Button>
            <Button variant="outline" onClick={() => setDelOpen(true)}>
              <Trash2 className="text-destructive size-4" />
            </Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="versions">
        <TabsList>
          <TabsTrigger value="overview">{t('tabs.overview')}</TabsTrigger>
          <TabsTrigger value="versions">{t('tabs.versions')}</TabsTrigger>
          <TabsTrigger value="preview">{t('tabs.preview')}</TabsTrigger>
          <TabsTrigger value="links">{t('tabs.links')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="pt-4">
          <dl className="grid max-w-xl grid-cols-[8rem_1fr] gap-y-3 text-sm">
            <dt className="text-muted-foreground">{t('overview.id')}</dt>
            <dd className="font-mono">{shortId(dataset.id)}</dd>
            <dt className="text-muted-foreground">{t('overview.owner')}</dt>
            <dd className="font-mono">
              {shortId(dataset.owner_id)}
              {isOwner && <span className="text-muted-foreground ml-1">{t('you')}</span>}
            </dd>
            <dt className="text-muted-foreground">{t('overview.visibility')}</dt>
            <dd>{t(`visibility.${dataset.visibility}`)}</dd>
            <dt className="text-muted-foreground">{t('overview.version')}</dt>
            <dd className="tabular-nums">{dataset.version}</dd>
            <dt className="text-muted-foreground">{t('overview.description')}</dt>
            <dd>{dataset.description || t('overview.none')}</dd>
          </dl>
        </TabsContent>

        <TabsContent value="versions" className="pt-4">
          <DatasetVersionsPanel datasetId={id} canManage={canManage} />
        </TabsContent>
        <TabsContent value="preview" className="pt-4">
          <DatasetPreviewPanel datasetId={id} />
        </TabsContent>
        <TabsContent value="links" className="pt-4">
          <DatasetLinksPanel datasetId={id} canManage={canManage} />
        </TabsContent>
      </Tabs>

      <CreateDatasetDialog
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
