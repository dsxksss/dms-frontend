import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { useTranslation } from 'react-i18next'
import { Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { TableCard } from '@/components/data-grid'
import { EmptyState, ErrorState, TableSkeleton } from '@/components/states'
import { Pagination } from '@/components/pagination'
import { columnRoleTone } from '@/components/tone'
import { useDebounce } from '@/hooks/use-debounce'
import { useDatasetPreview } from '@/hooks/use-datasets'
import type { ColumnRole, ColumnSchema, DatasetScope } from '@/api/datasets'

const ROLE_ORDER: ColumnRole[] = ['id', 'feature', 'label', 'ignore']
const CANVAS_PAGE_LIMIT = 200
const CANVAS_PAGE_SIZE_OPTIONS = [100, 200] as const

/** 数据集预览（富屏）：全列搜索 + 列角色图例 + 可排序表头 + 斑马行。 */
export function DatasetPreviewPanel({
  projectId,
  scope,
  datasetId,
  schema,
}: {
  projectId?: string
  scope?: DatasetScope
  datasetId: string
  schema?: ColumnSchema[]
}) {
  const { t } = useTranslation('datasets')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<string | undefined>(undefined)
  const [desc, setDesc] = useState(false)
  const [page, setPage] = useState({ limit: CANVAS_PAGE_LIMIT, offset: 0 })
  const debounced = useDebounce(search, 300)
  const datasetScope = scope ?? projectId ?? ''

  // 列名 → schema（role/type）映射，用于表头徽标与 id 单元上色。
  const byName = useMemo(() => {
    const m = new Map<string, ColumnSchema>()
    for (const c of schema ?? []) m.set(c.name, c)
    return m
  }, [schema])

  const query = useDatasetPreview(datasetScope, datasetId, {
    search: debounced || undefined,
    sort,
    desc: sort ? desc : undefined,
    limit: page.limit,
    offset: page.offset,
  })
  const data = query.data
  const columns = data?.columns ?? []

  useEffect(() => {
    setPage((current) =>
      (CANVAS_PAGE_SIZE_OPTIONS as readonly number[]).includes(current.limit)
        ? current
        : { limit: CANVAS_PAGE_LIMIT, offset: 0 },
    )
  }, [])

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
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
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
          <span className="text-muted-foreground text-[11.5px] font-semibold">
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
        <DatasetCanvasTable
          columns={columns}
          rows={data?.rows ?? []}
          byName={byName}
          total={data?.total ?? 0}
          page={page}
          sort={sort}
          desc={desc}
          onSort={onSort}
          onPageChange={setPage}
          pageSizeOptions={CANVAS_PAGE_SIZE_OPTIONS}
        />
      )}
    </div>
  )
}

function DatasetCanvasTable({
  columns,
  rows,
  byName,
  total,
  page,
  sort,
  desc,
  onSort,
  onPageChange,
  pageSizeOptions,
}: {
  columns: string[]
  rows: string[][]
  byName: Map<string, ColumnSchema>
  total: number
  page: { limit: number; offset: number }
  sort?: string
  desc: boolean
  onSort: (column: string) => void
  onPageChange: (page: { limit: number; offset: number }) => void
  pageSizeOptions: readonly number[]
}) {
  const { t } = useTranslation('datasets')
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [viewportWidth, setViewportWidth] = useState(0)
  const [hoverRow, setHoverRow] = useState<number | null>(null)
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  const [resizing, setResizing] = useState<{
    column: string
    startX: number
    startWidth: number
  } | null>(null)

  const columnKey = columns.join('|')
  useEffect(() => {
    setColumnWidths({})
    setHoverRow(null)
  }, [columnKey])

  useEffect(() => {
    const node = scrollRef.current
    if (!node) return
    const update = () => setViewportWidth(node.clientWidth)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const gridColumns = useMemo(
    () =>
      columns.map((column) => {
        const meta = byName.get(column)
        const width =
          columnWidths[column] ??
          (meta?.type === 'string' ? 240 : meta?.role === 'id' ? 150 : 180)
        return {
          id: column,
          label: column,
          meta,
          width,
          min: 96,
        }
      }),
    [byName, columnWidths, columns],
  )

  const tableWidth = Math.max(
    viewportWidth,
    gridColumns.reduce((sum, column) => sum + column.width, 0),
  )
  const headerHeight = 52
  const rowHeight = 38
  const tableHeight = headerHeight + Math.max(rows.length, 1) * rowHeight

  const columnStarts = useMemo(() => {
    const starts: number[] = []
    let next = 0
    for (const column of gridColumns) {
      starts.push(next)
      next += column.width
    }
    return starts
  }, [gridColumns])

  const getCanvasPoint = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
  }

  const getColumnIndexAt = (x: number) => {
    for (let index = 0; index < gridColumns.length; index += 1) {
      const start = columnStarts[index]
      const end = start + gridColumns[index].width
      if (x >= start && x <= end) return index
    }
    return -1
  }

  const getResizeColumnAt = (x: number) => {
    for (let index = 0; index < gridColumns.length; index += 1) {
      const end = columnStarts[index] + gridColumns[index].width
      if (Math.abs(x - end) <= 5) return gridColumns[index]
    }
    return null
  }

  useEffect(() => {
    if (!resizing) return
    const previousCursor = document.body.style.cursor
    const previousUserSelect = document.body.style.userSelect
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const onPointerMove = (event: PointerEvent) => {
      const nextWidth = Math.max(
        96,
        resizing.startWidth + event.clientX - resizing.startX,
      )
      setColumnWidths((current) => ({
        ...current,
        [resizing.column]: nextWidth,
      }))
    }
    const onPointerUp = () => {
      document.body.style.cursor = previousCursor
      document.body.style.userSelect = previousUserSelect
      setResizing(null)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp, { once: true })
    return () => {
      document.body.style.cursor = previousCursor
      document.body.style.userSelect = previousUserSelect
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [resizing])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const width = Math.max(1, tableWidth)
    const height = Math.max(1, tableHeight)
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const css = getComputedStyle(document.documentElement)
    const color = (name: string, fallback: string) =>
      css.getPropertyValue(name).trim() || fallback
    const card = color('--card', '#ffffff')
    const surface = color('--surface-2', '#fafbfd')
    const divider = color('--divider', '#f1f3f7')
    const border = color('--border', '#e9edf4')
    const foreground = color('--foreground', '#1b2330')
    const muted = color('--muted-foreground', '#727d8d')
    const brand = color('--brand', '#2f6bff')
    const rowHover = 'rgba(47, 107, 255, 0.06)'
    const zebra = 'rgba(47, 107, 255, 0.025)'

    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = card
    ctx.fillRect(0, 0, width, height)
    ctx.fillStyle = surface
    ctx.fillRect(0, 0, width, headerHeight)
    ctx.strokeStyle = border
    ctx.beginPath()
    ctx.moveTo(0, headerHeight + 0.5)
    ctx.lineTo(width, headerHeight + 0.5)
    ctx.stroke()

    ctx.textBaseline = 'middle'
    gridColumns.forEach((column, index) => {
      const x = columnStarts[index]
      const active = sort === column.id
      ctx.save()
      ctx.beginPath()
      ctx.rect(x + 14, 0, Math.max(0, column.width - 28), headerHeight)
      ctx.clip()
      ctx.font = '700 11px Inter, ui-sans-serif, system-ui, sans-serif'
      ctx.fillStyle = active ? brand : foreground
      ctx.fillText(
        `${column.label} ${active ? (desc ? '↓' : '↑') : '↕'}`,
        x + 14,
        18,
      )
      if (column.meta) {
        ctx.font = '600 10.5px Inter, ui-sans-serif, system-ui, sans-serif'
        ctx.fillStyle = muted
        ctx.fillText(
          `${t(`columnRole.${column.meta.role}`)} · ${column.meta.type}`,
          x + 14,
          38,
        )
      }
      ctx.restore()

      ctx.strokeStyle = border
      ctx.beginPath()
      ctx.moveTo(x + column.width + 0.5, 12)
      ctx.lineTo(x + column.width + 0.5, headerHeight - 12)
      ctx.stroke()
    })

    rows.forEach((row, rowIndex) => {
      const y = headerHeight + rowIndex * rowHeight
      if (rowIndex % 2 === 1) {
        ctx.fillStyle = zebra
        ctx.fillRect(0, y, width, rowHeight)
      }
      if (hoverRow === rowIndex) {
        ctx.fillStyle = rowHover
        ctx.fillRect(0, y, width, rowHeight)
      }
      ctx.strokeStyle = divider
      ctx.beginPath()
      ctx.moveTo(0, y + rowHeight + 0.5)
      ctx.lineTo(width, y + rowHeight + 0.5)
      ctx.stroke()

      gridColumns.forEach((column, columnIndex) => {
        const x = columnStarts[columnIndex]
        const cell = row[columnIndex] ?? ''
        const isId = column.meta?.role === 'id'
        ctx.save()
        ctx.beginPath()
        ctx.rect(x + 14, y, Math.max(0, column.width - 24), rowHeight)
        ctx.clip()
        ctx.font = isId
          ? '600 12px ui-monospace, SFMono-Regular, Menlo, monospace'
          : '500 13px Inter, ui-sans-serif, system-ui, sans-serif'
        ctx.fillStyle = isId ? brand : foreground
        ctx.fillText(String(cell), x + 14, y + rowHeight / 2)
        ctx.restore()
      })
    })

    if (rows.length === 0) {
      ctx.font = '500 13px Inter, ui-sans-serif, system-ui, sans-serif'
      ctx.fillStyle = muted
      ctx.fillText(t('preview.empty'), 14, headerHeight + rowHeight / 2)
    }
  }, [
    columnStarts,
    desc,
    gridColumns,
    hoverRow,
    rows,
    sort,
    t,
    tableHeight,
    tableWidth,
  ])

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const point = getCanvasPoint(event)
    if (point.y < headerHeight && getResizeColumnAt(point.x)) {
      event.currentTarget.style.cursor = 'col-resize'
      setHoverRow(null)
      return
    }
    event.currentTarget.style.cursor =
      point.y < headerHeight ? 'pointer' : 'default'
    if (point.y < headerHeight) {
      setHoverRow(null)
      return
    }
    const rowIndex = Math.floor((point.y - headerHeight) / rowHeight)
    setHoverRow(rowIndex >= 0 && rowIndex < rows.length ? rowIndex : null)
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const point = getCanvasPoint(event)
    if (point.y >= headerHeight) return
    const column = getResizeColumnAt(point.x)
    if (!column) return
    event.preventDefault()
    setResizing({
      column: column.id,
      startX: event.clientX,
      startWidth: column.width,
    })
  }

  const handleClick = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (resizing) return
    const point = getCanvasPoint(event)
    if (point.y >= headerHeight || getResizeColumnAt(point.x)) return
    const column = gridColumns[getColumnIndexAt(point.x)]
    if (column) onSort(column.id)
  }

  return (
    <TableCard>
      <div
        ref={scrollRef}
        className="max-h-[620px] min-h-[280px] overflow-auto"
        onMouseLeave={() => setHoverRow(null)}
      >
        <canvas
          ref={canvasRef}
          role="grid"
          aria-label={t('preview.canvasTable', {
            defaultValue: '高性能表格',
          })}
          className="block"
          onClick={handleClick}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
        />
      </div>
      <div className="border-divider text-muted-foreground flex flex-wrap items-center justify-between gap-3 border-t px-[18px] py-3 text-[12.5px]">
        <span>
          {t('preview.footer', {
            shown: rows.length,
            total,
          })}
        </span>
        <Pagination
          limit={page.limit}
          offset={page.offset}
          total={total}
          onChange={onPageChange}
          pageSizeOptions={pageSizeOptions}
        />
      </div>
    </TableCard>
  )
}
