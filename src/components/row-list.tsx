import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/**
 * 统一的「卡片行列表」：Card 容器 + 行间 divider，复刻 design_handoff 的列表行样式。
 * 替换旧的 `ul.divide-y rounded-md border`。
 */
export function RowList({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <Card className={cn('gap-0 py-0', className)}>{children}</Card>
}

export function Row({
  children,
  className,
  onClick,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'border-divider flex items-center gap-3 border-b px-4 py-3 text-[13px] last:border-b-0',
        onClick && 'hover:bg-row-hover cursor-pointer',
        className,
      )}
    >
      {children}
    </div>
  )
}
