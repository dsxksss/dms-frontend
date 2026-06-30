import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/**
 * 网格表（原型 .card + grid 表头 + .trow 行）—— 全站列表的统一骨架。
 * 各屏自带 `cols`(gridTemplateColumns) 与单元格渲染，保持「定制网格」灵活性，
 * 同时统一卡片/表头/行/分隔/hover 视觉。
 */

/** 列表卡片外壳：白底、14px 圆角、隐藏溢出。 */
export function TableCard({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'card-shadow bg-card overflow-hidden rounded-[14px] border',
        className,
      )}
    >
      {children}
    </div>
  )
}

/** 表头行：浅灰底 + 下边框；children 为 <Th> 单元。 */
export function GridHeader({
  cols,
  children,
  className,
}: {
  cols: string
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'bg-surface-2 grid items-center border-b px-[18px] py-[11px]',
        className,
      )}
      style={{ gridTemplateColumns: cols }}
    >
      {children}
    </div>
  )
}

/** 表头单元（11px 大写）。 */
export function Th({
  children,
  className,
}: {
  children?: ReactNode
  className?: string
}) {
  return <div className={cn('th', className)}>{children}</div>
}

/** 数据行：分隔线 + 可选 hover/点击。 */
export function GridRow({
  cols,
  children,
  onClick,
  className,
}: {
  cols: string
  children: ReactNode
  onClick?: () => void
  className?: string
}) {
  return (
    <div
      className={cn(
        'border-divider grid items-center border-b px-[18px] py-3 text-[13px] last:border-b-0',
        onClick && 'trow cursor-pointer',
        className,
      )}
      style={{ gridTemplateColumns: cols }}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

/** 列表底部栏（计数 + 分页）。 */
export function GridFooter({ children }: { children: ReactNode }) {
  return (
    <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-3 px-[18px] py-3 text-[12.5px]">
      {children}
    </div>
  )
}

export type GridSortState = {
  key: string
  desc: boolean
} | null

export function nextGridSort(
  current: GridSortState,
  key: string,
): GridSortState {
  if (current?.key !== key) return { key, desc: false }
  if (!current.desc) return { key, desc: true }
  return null
}

export function GridSearchToolbar({
  value,
  onChange,
  placeholder,
  resultText,
  actions,
  fieldValue,
  onFieldChange,
  fieldOptions,
  allFieldsLabel,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  resultText?: ReactNode
  actions?: ReactNode
  fieldValue?: string
  onFieldChange?: (value: string) => void
  fieldOptions?: Array<{ value: string; label: string }>
  allFieldsLabel?: string
}) {
  const hasFieldFilter = !!onFieldChange && !!fieldOptions?.length
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
      <div className="flex w-full max-w-[560px] min-w-[260px] flex-wrap items-center gap-2">
        {hasFieldFilter && (
          <Select value={fieldValue ?? '__all__'} onValueChange={onFieldChange}>
            <SelectTrigger className="h-9 w-[132px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start">
              <SelectItem value="__all__">
                {allFieldsLabel ?? 'All fields'}
              </SelectItem>
              {fieldOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="relative min-w-[220px] flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            className="h-9 pr-8 pl-9"
          />
          {value.trim() && (
            <button
              type="button"
              className="text-muted-foreground hover:bg-muted hover:text-foreground absolute top-1/2 right-2 flex size-5 -translate-y-1/2 items-center justify-center rounded"
              onClick={() => onChange('')}
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>
      {(actions || resultText) && (
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          {resultText && (
            <div className="text-muted-foreground text-[12.5px] font-medium">
              {resultText}
            </div>
          )}
          {actions}
        </div>
      )}
    </div>
  )
}

export function GridSortButton({
  sortKey,
  sort,
  onSortChange,
  label,
  children,
}: {
  sortKey: string
  sort: GridSortState
  onSortChange: (next: GridSortState) => void
  label: string
  children: ReactNode
}) {
  const active = sort?.key === sortKey
  const Icon = active ? (sort.desc ? ArrowDown : ArrowUp) : ArrowUpDown
  return (
    <button
      type="button"
      className={cn(
        'flex min-w-0 items-center gap-1 truncate text-left text-[11px] font-semibold tracking-[0.04em] uppercase',
        active ? 'text-brand' : 'text-muted-foreground hover:text-foreground',
      )}
      title={label}
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation()
        onSortChange(nextGridSort(sort, sortKey))
      }}
    >
      <span className="truncate">{children}</span>
      <Icon className="size-3 shrink-0" />
    </button>
  )
}

export type ResizableGridColumn = {
  id: string
  width: number
  min?: number
  max?: number
  flex?: number
  resizable?: boolean
}

export function useResizableGridColumns(columns: ResizableGridColumn[]) {
  const columnKey = useMemo(
    () => columns.map((column) => `${column.id}:${column.width}`).join('|'),
    [columns],
  )
  const [widths, setWidths] = useState<Record<string, number>>(() =>
    Object.fromEntries(columns.map((column) => [column.id, column.width])),
  )
  const [lockedWidths, setLockedWidths] = useState(false)

  useEffect(() => {
    setWidths(
      Object.fromEntries(columns.map((column) => [column.id, column.width])),
    )
    setLockedWidths(false)
  }, [columnKey, columns])

  const template = useMemo(
    () =>
      columns
        .map((column) => {
          const width = widths[column.id] ?? column.width
          if (lockedWidths || column.flex === 0) return `${width}px`
          return `minmax(${width}px, ${column.flex ?? 1}fr)`
        })
        .join(' '),
    [columns, widths, lockedWidths],
  )

  const startResize = useCallback(
    (columnId: string, event: ReactPointerEvent<HTMLElement>) => {
      const column = columns.find((item) => item.id === columnId)
      if (!column || column.resizable === false) return

      event.preventDefault()
      event.stopPropagation()

      let grid: HTMLElement | null = event.currentTarget
      while (grid) {
        const style = window.getComputedStyle(grid)
        if (
          style.display.includes('grid') &&
          grid.children.length >= columns.length
        ) {
          break
        }
        grid = grid.parentElement
      }
      const measuredWidths = grid
        ? Object.fromEntries(
            columns.map((item, index) => {
              const child = grid.children.item(index)
              const width =
                child instanceof HTMLElement
                  ? child.getBoundingClientRect().width
                  : (widths[item.id] ?? item.width)
              return [item.id, width]
            }),
          )
        : {}
      const baseWidths = {
        ...Object.fromEntries(
          columns.map((item) => [item.id, widths[item.id] ?? item.width]),
        ),
        ...measuredWidths,
      }
      setLockedWidths(true)
      setWidths(baseWidths)

      const startX = event.clientX
      const startWidth = baseWidths[columnId] ?? column.width
      const min = column.min ?? 72
      const max = column.max ?? Number.POSITIVE_INFINITY
      const previousCursor = document.body.style.cursor
      const previousUserSelect = document.body.style.userSelect

      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'

      const onPointerMove = (moveEvent: PointerEvent) => {
        const next = Math.min(
          max,
          Math.max(min, startWidth + moveEvent.clientX - startX),
        )
        setWidths({ ...baseWidths, [columnId]: next })
      }

      const onPointerUp = () => {
        document.body.style.cursor = previousCursor
        document.body.style.userSelect = previousUserSelect
        window.removeEventListener('pointermove', onPointerMove)
        window.removeEventListener('pointerup', onPointerUp)
      }

      window.addEventListener('pointermove', onPointerMove)
      window.addEventListener('pointerup', onPointerUp, { once: true })
    },
    [columns, widths],
  )

  return { template, startResize, widths }
}

export function GridColumnResizeHandle({
  label,
  onPointerDown,
}: {
  label: string
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="group absolute inset-y-0 right-0 z-10 flex w-3 cursor-col-resize items-stretch justify-center rounded-sm outline-none"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={onPointerDown}
    >
      <span
        className="bg-muted-foreground/35 group-hover:bg-brand group-focus-visible:bg-brand group-active:bg-brand my-0.5 w-px rounded-full transition group-hover:w-0.5 group-focus-visible:w-0.5 group-active:w-0.5"
        onPointerDown={onPointerDown}
      />
    </button>
  )
}
