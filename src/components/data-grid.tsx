import type { ReactNode } from 'react'
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
