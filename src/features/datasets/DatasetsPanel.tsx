import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Download, Grid3x3, MoreHorizontal, Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PageHeader } from '@/components/page-header'
import { GridHeader, GridRow, TableCard, Th } from '@/components/data-grid'
import { EmptyState, ErrorState, TableSkeleton } from '@/components/states'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { cn } from '@/lib/utils'
import { roleAtLeast } from '@/lib/roles'
import { useProjectRole } from '@/hooks/use-projects'
import { useToastError } from '@/hooks/use-toast-error'
import { useDatasets, useDatasetTags, useDeleteDataset } from '@/hooks/use-datasets'
import { datasetsApi, type Dataset } from '@/api/datasets'
import { CreateDatasetDialog } from './CreateDatasetDialog'

const COLS = '1.6fr 1fr 130px 110px'

/** 项目数据集列表（成员可见，Contributor+ 可写）。 */
export function DatasetsPanel({ projectId }: { projectId: string }) {
  const { t } = useTranslation(['datasets', 'common'])
  const navigate = useNavigate()
  const role = useProjectRole(projectId)
  const canWrite = roleAtLeast(role, 'contributor')
  const del = useDeleteDataset(projectId)
  const toastError = useToastError()
  const [tag, setTag] = useState<string | undefined>(undefined)
  const query = useDatasets(projectId, tag)
  const tags = useDatasetTags(projectId)
  const [createOpen, setCreateOpen] = useState(false)
  const [delTarget, setDelTarget] = useState<Dataset | null>(null)
  const data = query.data ?? []
  const hasData = data.length > 0

  const onDelete = () => {
    if (!delTarget) return
    del
      .mutateAsync({ id: delTarget.id, version: delTarget.version })
      .then(() => {
        toast.success(t('toast.deleted'))
        setDelTarget(null)
      })
      .catch(toastError)
  }

  const createBtn = (
    <Button onClick={() => setCreateOpen(true)}>
      <Plus className="size-4" />
      {t('create.title')}
    </Button>
  )

  return (
    <div className="px-[26px] py-[22px] max-w-[1200px]">
      <PageHeader
        title={t('title')}
        titleEn="Datasets"
        description={t('subtitle')}
        actions={hasData ? createBtn : undefined}
      />

      {(tags.data?.length ?? 0) > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          <FilterChip active={!tag} onClick={() => setTag(undefined)}>
            {t('filter.allTags')}
          </FilterChip>
          {tags.data!.map((tg) => (
            <FilterChip key={tg} active={tag === tg} onClick={() => setTag(tg)}>
              {tg}
            </FilterChip>
          ))}
        </div>
      )}

      {query.isLoading ? (
        <TableSkeleton rows={5} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : data.length === 0 ? (
        <EmptyState
          title={t('empty.title')}
          hint={t('empty.description')}
          action={createBtn}
        />
      ) : (
        <TableCard>
          <GridHeader cols={COLS}>
            <Th>{t('columns.name')}</Th>
            <Th>{t('meta.tags')}</Th>
            <Th>{t('versions.versionNo')}</Th>
            <Th />
          </GridHeader>
          {data.map((ds) => (
            <GridRow
              key={ds.id}
              cols={COLS}
              onClick={() =>
                navigate(`/projects/${projectId}/datasets/${ds.id}`)
              }
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-accent text-brand">
                  <Grid3x3 className="size-4" />
                </div>
                <div className="min-w-0">
                  <div className="truncate font-bold">{ds.name}</div>
                  {ds.description && (
                    <div className="truncate text-[11.5px] text-muted-foreground">
                      {ds.description}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {ds.tags.slice(0, 3).map((tg) => (
                  <Badge key={tg} variant="info">
                    {tg}
                  </Badge>
                ))}
              </div>
              {/* 列表项不含行数/时间戳；此处用版本号占位，避免 N+1 拉版本。 */}
              <div className="mono text-[12px] text-muted-foreground">
                v{ds.version}
              </div>
              <div
                className="flex items-center justify-end gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="text-[12px] font-semibold text-brand">
                  {t('row.open')} →
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" title={t('actions.more', { ns: 'common' })}>
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() =>
                        navigate(`/projects/${projectId}/datasets/${ds.id}`)
                      }
                    >
                      {t('row.open')}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        datasetsApi.exportDownload(projectId, ds.id, 'csv')
                      }
                    >
                      <Download className="size-4" />
                      {t('preview.exportCsv')}
                    </DropdownMenuItem>
                    {canWrite && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDelTarget(ds)}
                        >
                          <Trash2 className="size-4" />
                          {t('row.delete')}
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </GridRow>
          ))}
        </TableCard>
      )}

      <ConfirmDialog
        open={!!delTarget}
        onOpenChange={(o) => !o && setDelTarget(null)}
        title={t('delete.title')}
        description={t('delete.description', { name: delTarget?.name })}
        destructive
        confirmText={t('delete.confirm')}
        loading={del.isPending}
        onConfirm={onDelete}
      />

      <CreateDatasetDialog
        projectId={projectId}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </div>
  )
}

/** 标签过滤胶囊。 */
function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-2.5 py-1 text-[12px] font-semibold transition',
        active
          ? 'border-brand bg-accent text-brand'
          : 'border-transparent bg-[#F0F2F6] text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}
