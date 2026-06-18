import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { errorI18nKey } from '@/lib/errors'
import { cn } from '@/lib/utils'

/** 空态卡片（原型：白卡居中浅灰文案）。 */
export function EmptyState({
  title,
  hint,
  action,
  className,
}: {
  title: ReactNode
  hint?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'card-shadow rounded-[14px] border bg-card px-6 py-12 text-center',
        className,
      )}
    >
      <p className="text-[13px] font-medium text-muted-foreground">{title}</p>
      {hint && (
        <p className="mt-1 text-[12px] text-muted-foreground/80">{hint}</p>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}

/** 错误态卡片：本地化报错 + 重试。 */
export function ErrorState({
  error,
  onRetry,
  className,
}: {
  error: unknown
  onRetry?: () => void
  className?: string
}) {
  const { t } = useTranslation('common')
  const msg = t(errorI18nKey(error), {
    defaultValue: t('errors.generic', { defaultValue: '出错了，请稍后重试。' }),
  })
  return (
    <div
      className={cn(
        'card-shadow rounded-[14px] border bg-card px-6 py-10 text-center',
        className,
      )}
    >
      <p className="text-[13px] font-semibold text-destructive">{msg}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          {t('actions.retry', { defaultValue: '重试' })}
        </Button>
      )}
    </div>
  )
}

/** 表格骨架：列表加载占位。 */
export function TableSkeleton({
  rows = 6,
  className,
}: {
  rows?: number
  className?: string
}) {
  return (
    <div
      className={cn(
        'card-shadow overflow-hidden rounded-[14px] border bg-card',
        className,
      )}
    >
      <div className="border-b bg-surface-2 px-[18px] py-[11px]">
        <Skeleton className="h-3 w-24" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 border-b border-divider px-[18px] py-3.5 last:border-b-0"
        >
          <Skeleton className="size-7 rounded-lg" />
          <Skeleton className="h-3.5 flex-1" />
          <Skeleton className="h-3.5 w-16" />
        </div>
      ))}
    </div>
  )
}

/** 卡片网格骨架：项目 / 组织等卡片列表加载占位。 */
export function GridSkeleton({
  count = 6,
  columns = 3,
}: {
  count?: number
  columns?: number
}) {
  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: `repeat(${columns},minmax(0,1fr))` }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-[132px] rounded-[14px]" />
      ))}
    </div>
  )
}
