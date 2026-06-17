import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { useDatasetPreview } from '@/hooks/use-datasets'
import { useDebounce } from '@/hooks/use-debounce'
import { useToastError } from '@/hooks/use-toast-error'
import { datasetsApi } from '@/api/datasets'

export function DatasetPreviewPanel({
  projectId,
  datasetId,
}: {
  projectId: string
  datasetId: string
}) {
  const { t } = useTranslation('datasets')
  const toastError = useToastError()
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<string>('')
  const [desc, setDesc] = useState(false)
  const [page, setPage] = useState({ limit: 20, offset: 0 })

  const debouncedSearch = useDebounce(search, 300)
  const params = {
    ...page,
    search: debouncedSearch || undefined,
    sort: sort || undefined,
    desc,
  }
  const query = useDatasetPreview(projectId, datasetId, params)
  const cols = query.data?.columns ?? []

  const doExport = async (format: 'csv' | 'parquet') => {
    try {
      await datasetsApi.exportDownload(projectId, datasetId, format)
    } catch (e) {
      toastError(e)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="dssearch">{t('preview.title')}</Label>
          <div className="relative">
            <Search className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
            <Input
              id="dssearch"
              className="w-56 pl-8"
              placeholder={t('preview.search')}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage((p) => ({ ...p, offset: 0 }))
              }}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>{t('preview.sortBy')}</Label>
          <Select value={sort} onValueChange={(v) => setSort(v === '__none' ? '' : v)}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">—</SelectItem>
              {cols.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <Switch checked={desc} onCheckedChange={setDesc} />
          {t('preview.desc')}
        </label>
        <div className="ml-auto flex gap-2 pb-0.5">
          <Button variant="outline" size="sm" onClick={() => doExport('csv')}>
            <Download className="size-4" />
            {t('preview.exportCsv')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => doExport('parquet')}>
            <Download className="size-4" />
            {t('preview.exportParquet')}
          </Button>
        </div>
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
