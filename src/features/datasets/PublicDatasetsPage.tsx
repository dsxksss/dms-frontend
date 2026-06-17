import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, Globe } from 'lucide-react'

import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Pagination } from '@/components/pagination'
import { EmptyState, ErrorState, TableSkeleton } from '@/components/states'
import {
  usePublicDatasets,
  usePublicDatasetPreview,
} from '@/hooks/use-public-datasets'
import { useToastError } from '@/hooks/use-toast-error'
import { systemDatasetsApi } from '@/api/datasets'
import { cn } from '@/lib/utils'

function PreviewPanel({ datasetId }: { datasetId: string }) {
  const { t } = useTranslation('datasets')
  const toastError = useToastError()
  const [page, setPage] = useState({ limit: 20, offset: 0 })
  const query = usePublicDatasetPreview(datasetId, page)
  const cols = query.data?.columns ?? []

  const doExport = async (format: 'csv' | 'parquet') => {
    try {
      await systemDatasetsApi.exportDownload(datasetId, format)
    } catch (e) {
      toastError(e)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => doExport('csv')}>
          <Download className="size-4" />
          {t('preview.exportCsv')}
        </Button>
        <Button variant="outline" size="sm" onClick={() => doExport('parquet')}>
          <Download className="size-4" />
          {t('preview.exportParquet')}
        </Button>
      </div>
      {query.isLoading ? (
        <TableSkeleton rows={6} cols={4} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data && query.data.rows.length > 0 ? (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  {cols.map((c) => (
                    <TableHead key={c} className="whitespace-nowrap">
                      {c}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.rows.map((row, i) => (
                  <TableRow key={i}>
                    {row.map((cell, j) => (
                      <TableCell key={j} className="tabular-nums whitespace-nowrap">
                        {cell}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination
            limit={page.limit}
            offset={page.offset}
            total={query.data.total}
            onChange={setPage}
          />
        </>
      ) : (
        <EmptyState title={t('preview.empty')} />
      )}
    </div>
  )
}

export function PublicDatasetsPage() {
  const { t } = useTranslation('datasets')
  const query = usePublicDatasets()
  const [selected, setSelected] = useState<string | null>(null)

  const items = query.data ?? []
  const current = items.find((d) => d.id === selected) ?? items[0]

  return (
    <div className="space-y-6">
      <PageHeader title={t('public.title')} description={t('public.subtitle')} />

      {query.isLoading ? (
        <TableSkeleton rows={4} cols={2} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Globe className="size-8" />}
          title={t('public.empty')}
          description={t('public.emptyDesc')}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
          <div className="space-y-1.5">
            {items.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelected(d.id)}
                className={cn(
                  'w-full rounded-md border px-3 py-2 text-left text-sm transition-colors',
                  current?.id === d.id
                    ? 'border-brand/50 bg-sidebar-accent'
                    : 'hover:bg-sidebar-accent/60',
                )}
              >
                <div className="font-medium">{d.name}</div>
                {d.description && (
                  <div className="text-muted-foreground truncate text-xs">
                    {d.description}
                  </div>
                )}
              </button>
            ))}
          </div>
          <Card>
            <CardContent className="pt-6">
              {current ? (
                <PreviewPanel datasetId={current.id} />
              ) : (
                <EmptyState title={t('public.pick')} />
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
