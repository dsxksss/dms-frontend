import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Table2,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/page-header'
import { EmptyState, ErrorState } from '@/components/states'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
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
import { cn } from '@/lib/utils'
import type { Dataset } from '@/api/datasets'
import { CreateDatasetDialog } from './CreateDatasetDialog'

const COLS = 'grid-cols-[1.6fr_80px_120px]'

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

  const items = query.data ?? []

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

  const createBtn = canWrite && (
    <Button onClick={() => setCreateOpen(true)}>
      <Plus className="size-4" />
      {t('create.title')}
    </Button>
  )

  return (
    <div className="mx-auto max-w-[1200px] space-y-4">
      <PageHeader
        title={t('title')}
        titleI18n={{ key: 'title', ns: 'datasets' }}
        description={t('subtitle')}
        actions={createBtn || undefined}
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
          action={createBtn || undefined}
        />
      ) : (
        <Card className="gap-0 overflow-hidden py-0">
          <div className="overflow-x-auto">
            <div className="min-w-[520px]">
              <div
                className={cn(
                  'bg-surface-2 text-muted-foreground grid gap-2 border-b px-[18px] py-2.5 text-[11px] font-semibold tracking-[0.04em] uppercase',
                  COLS,
                )}
              >
                <div>{t('columns.name')}</div>
                <div>{t('columns.version')}</div>
                <div />
              </div>
              {items.map((d) => (
                <div
                  key={d.id}
                  className={cn(
                    'border-divider hover:bg-row-hover grid cursor-pointer items-center gap-2 border-b px-[18px] py-3 text-[13px] last:border-b-0',
                    COLS,
                  )}
                  onClick={() => navigate(`/projects/${projectId}/datasets/${d.id}`)}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="bg-accent text-brand flex size-8 shrink-0 items-center justify-center rounded-[9px]">
                      <Table2 className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-bold">{d.name}</span>
                      <span className="text-muted-foreground block truncate text-[11.5px]">
                        {d.description || '—'}
                      </span>
                    </span>
                  </span>
                  <span>
                    <Badge variant="neutral">v{d.version}</Badge>
                  </span>
                  <span className="flex items-center justify-end gap-1.5">
                    <span className="text-brand text-[12.5px] font-semibold">
                      {t('row.open')} →
                    </span>
                    {canWrite && (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          asChild
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button variant="ghost" size="icon-sm">
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
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

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
