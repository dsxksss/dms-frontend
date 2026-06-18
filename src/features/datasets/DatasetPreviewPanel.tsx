import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import { columnRoleTone } from '@/lib/tone'
import { cn } from '@/lib/utils'
import type { ColumnRole, ColumnSchema } from '@/api/datasets'

const ROLE_LEGEND: ColumnRole[] = ['id', 'feature', 'label', 'ignore']

export function DatasetPreviewPanel({
  projectId,
  datasetId,
  schema = [],
}: {
  projectId: string
  datasetId: string
  /** 当前版本列模式（name→role/type），用于在表头标注角色与类型。 */
  schema?: ColumnSchema[]
}) {
  const { t } = useTranslation('datasets')
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
  const schemaMap = new Map(schema.map((c) => [c.name, c]))

  const onSort = (col: string) => {
    if (sort === col) setDesc((d) => !d)
    else {
      setSort(col)
      setDesc(false)
    }
    setPage((p) => ({ ...p, offset: 0 }))
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-2.5 left-3 size-[15px]" />
          <Input
            className="w-60 pl-9"
            placeholder={t('preview.search')}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage((p) => ({ ...p, offset: 0 }))
            }}
          />
        </div>
        <span className="text-muted-foreground text-[12px]">
          {t('preview.columnRoles')}：
        </span>
        {ROLE_LEGEND.map((r) => (
          <Badge key={r} variant={columnRoleTone(r)}>
            {t(`columnRole.${r}`)}
          </Badge>
        ))}
      </div>

      {query.isLoading ? (
        <TableSkeleton rows={6} cols={4} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data && query.data.rows.length > 0 ? (
        <>
          <div className="bg-card overflow-x-auto rounded-[14px] border shadow-[0_1px_2px_rgba(20,40,80,0.04)]">
            <Table>
              <TableHeader>
                <TableRow className="bg-surface-2 hover:bg-surface-2">
                  {cols.map((c) => {
                    const s = schemaMap.get(c)
                    return (
                      <TableHead
                        key={c}
                        onClick={() => onSort(c)}
                        className="hover:bg-muted/40 h-auto cursor-pointer py-2.5 align-top whitespace-nowrap select-none"
                      >
                        <div className="flex items-center gap-1">
                          <span className="text-foreground text-[12px] font-semibold normal-case">
                            {c}
                          </span>
                          {sort === c && (
                            <span className="text-brand text-[10px]">
                              {desc ? '▼' : '▲'}
                            </span>
                          )}
                        </div>
                        {s && (
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <Badge
                              variant={columnRoleTone(s.role)}
                              className="px-1.5 py-0.5 text-[10px]"
                            >
                              {t(`columnRole.${s.role}`)}
                            </Badge>
                            <span className="text-muted-foreground text-[10px]">
                              {s.type}
                            </span>
                          </div>
                        )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.rows.map((row, i) => (
                  <TableRow key={i} className={cn(i % 2 === 1 && 'bg-row-hover')}>
                    {row.map((cell, j) => {
                      const isId = schemaMap.get(cols[j])?.role === 'id'
                      return (
                        <TableCell
                          key={j}
                          className={cn(
                            'tabular-nums whitespace-nowrap',
                            isId
                              ? 'text-brand font-mono text-[12px] font-semibold'
                              : 'text-[12.5px]',
                          )}
                        >
                          {cell}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="text-muted-foreground text-[12px]">
            {t('preview.footer', {
              shown: query.data.rows.length,
              total: query.data.total,
            })}
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
