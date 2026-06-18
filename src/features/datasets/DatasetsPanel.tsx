import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Grid3x3, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/page-header'
import { GridHeader, GridRow, TableCard, Th } from '@/components/data-grid'
import { EmptyState, ErrorState, TableSkeleton } from '@/components/states'
import { useDatasets } from '@/hooks/use-datasets'
import { CreateDatasetDialog } from './CreateDatasetDialog'

const COLS = '1.6fr 90px 130px 110px'

/** 项目数据集列表（成员可见，Contributor+ 可写）。 */
export function DatasetsPanel({ projectId }: { projectId: string }) {
  const { t } = useTranslation('datasets')
  const navigate = useNavigate()
  const query = useDatasets(projectId)
  const [createOpen, setCreateOpen] = useState(false)
  const data = query.data ?? []

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
        actions={createBtn}
      />

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
            <Th>{t('columns.version')}</Th>
            <Th>{t('versions.versionNo')}</Th>
            <Th />
          </GridHeader>
          {data.map((ds) => (
            <GridRow
              key={ds.id}
              cols={COLS}
              onClick={() =>
                navigate(`projects/${projectId}/datasets/${ds.id}`)
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
              <div>
                <Badge variant="neutral">v{ds.version}</Badge>
              </div>
              {/* 列表项不含行数/时间戳；此处用版本号占位，避免 N+1 拉版本。 */}
              <div className="mono text-[12px] text-muted-foreground">
                v{ds.version}
              </div>
              <div className="text-right text-[12px] font-semibold text-brand">
                {t('row.open')} →
              </div>
            </GridRow>
          ))}
        </TableCard>
      )}

      <CreateDatasetDialog
        projectId={projectId}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </div>
  )
}
