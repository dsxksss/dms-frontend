import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowDown, ArrowUp, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { TableCard } from '@/components/data-grid'
import { EmptyState, ErrorState, TableSkeleton } from '@/components/states'
import { DEFAULT_PAGE_LIMIT, Pagination } from '@/components/pagination'
import { columnRoleTone } from '@/components/tone'
import { useDebounce } from '@/hooks/use-debounce'
import { useDatasetPreview } from '@/hooks/use-datasets'
import { cn } from '@/lib/utils'
import type { ColumnRole, ColumnSchema } from '@/api/datasets'

const ROLE_ORDER: ColumnRole[] = ['id', 'feature', 'label', 'ignore']

/** 数据集预览（富屏）：全列搜索 + 列角色图例 + 可排序表头 + 斑马行。 */
export function DatasetPreviewPanel({
  projectId,
  datasetId,
  schema,
}: {
  projectId: string
  datasetId: string
  schema?: ColumnSchema[]
}) {
  const { t } = useTranslation('datasets')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<string | undefined>(undefined)
  const [desc, setDesc] = useState(false)
  const [page, setPage] = useState({ limit: DEFAULT_PAGE_LIMIT, offset: 0 })
  const debounced = useDebounce(search, 300)

  // 列名 → schema（role/type）映射，用于表头徽标与 id 单元上色。
  const byName = useMemo(() => {
    const m = new Map<string, ColumnSchema>()
    for (const c of schema ?? []) m.set(c.name, c)
    return m
  }, [schema])

  const query = useDatasetPreview(projectId, datasetId, {
    search: debounced || undefined,
    sort,
    desc: sort ? desc : undefined,
    limit: page.limit,
    offset: page.offset,
  })
  const data = query.data
  const columns = data?.columns ?? []

  const onSort = (col: string) => {
    if (sort === col) {
      setDesc((d) => !d)
    } else {
      setSort(col)
      setDesc(false)
    }
    setPage((p) => ({ ...p, offset: 0 }))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={t('preview.search')}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage((p) => ({ ...p, offset: 0 }))
            }}
          />
        </div>
        {/* 列角色图例 */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11.5px] font-semibold text-muted-foreground">
            {t('preview.columnRoles')}
          </span>
          {ROLE_ORDER.map((r) => (
            <Badge key={r} variant={columnRoleTone(r)}>
              {t(`columnRole.${r}`)}
            </Badge>
          ))}
        </div>
      </div>

      {query.isLoading ? (
        <TableSkeleton rows={6} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : columns.length === 0 ? (
        <EmptyState title={t('preview.empty')} />
      ) : (
        <TableCard>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b bg-surface-2">
                  {columns.map((col) => {
                    const meta = byName.get(col)
                    const active = sort === col
                    return (
                      <th
                        key={col}
                        className="cursor-pointer select-none whitespace-nowrap px-3.5 py-2.5 text-left align-bottom"
                        onClick={() => onSort(col)}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="th !text-foreground">{col}</span>
                          {active &&
                            (desc ? (
                              <ArrowDown className="size-3 text-brand" />
                            ) : (
                              <ArrowUp className="size-3 text-brand" />
                            ))}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5">
                          {meta && (
                            <Badge variant={columnRoleTone(meta.role)}>
                              {t(`columnRole.${meta.role}`)}
                            </Badge>
                          )}
                          {meta && (
                            <span className="text-[10.5px] font-medium text-muted-foreground">
                              {meta.type}
                            </span>
                          )}
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {(data?.rows ?? []).map((row, ri) => (
                  <tr
                    key={ri}
                    className={cn(
                      'border-b border-divider last:border-b-0',
                      ri % 2 === 1 && 'bg-row-hover',
                    )}
                  >
                    {row.map((cell, ci) => {
                      const meta = byName.get(columns[ci])
                      const isId = meta?.role === 'id'
                      return (
                        <td
                          key={ci}
                          className={cn(
                            'whitespace-nowrap px-3.5 py-2',
                            isId && 'mono font-semibold text-brand',
                          )}
                        >
                          {cell}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-divider px-[18px] py-3 text-[12.5px] text-muted-foreground">
            <span>
              {t('preview.footer', {
                shown: data?.rows.length ?? 0,
                total: data?.total ?? 0,
              })}
            </span>
            <Pagination
              limit={page.limit}
              offset={page.offset}
              total={data?.total ?? 0}
              onChange={setPage}
            />
          </div>
        </TableCard>
      )}
    </div>
  )
}
