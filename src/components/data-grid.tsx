import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { cn } from '@/lib/utils'

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
        'card-shadow overflow-hidden rounded-[14px] border bg-card',
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
        'grid items-center border-b bg-surface-2 px-[18px] py-[11px]',
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
        'grid items-center border-b border-divider px-[18px] py-3 text-[13px] last:border-b-0',
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
    <div className="flex flex-wrap items-center justify-between gap-3 px-[18px] py-3 text-[12.5px] text-muted-foreground">
      {children}
    </div>
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

  useEffect(() => {
    setWidths(Object.fromEntries(columns.map((column) => [column.id, column.width])))
  }, [columnKey, columns])

  const template = useMemo(
    () =>
      columns
        .map((column) => {
          const width = widths[column.id] ?? column.width
          if (column.flex === 0) return `${width}px`
          return `minmax(${width}px, ${column.flex ?? 1}fr)`
        })
        .join(' '),
    [columns, widths],
  )

  const startResize = useCallback(
    (columnId: string, event: ReactPointerEvent<HTMLElement>) => {
      const column = columns.find((item) => item.id === columnId)
      if (!column || column.resizable === false) return

      event.preventDefault()
      event.stopPropagation()

      const startX = event.clientX
      const startWidth = widths[columnId] ?? column.width
      const min = column.min ?? 72
      const max = column.max ?? 640
      const previousCursor = document.body.style.cursor
      const previousUserSelect = document.body.style.userSelect

      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'

      const onPointerMove = (moveEvent: PointerEvent) => {
        const next = Math.min(max, Math.max(min, startWidth + moveEvent.clientX - startX))
        setWidths((current) => ({ ...current, [columnId]: next }))
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
        className="my-0.5 w-px rounded-full bg-muted-foreground/35 transition group-hover:w-0.5 group-hover:bg-brand group-focus-visible:w-0.5 group-focus-visible:bg-brand group-active:w-0.5 group-active:bg-brand"
        onPointerDown={onPointerDown}
      />
    </button>
  )
}
