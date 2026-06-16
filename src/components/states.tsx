import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle, Inbox } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { errorI18nKey } from '@/lib/errors'

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="text-muted-foreground">{icon ?? <Inbox className="size-8" />}</div>
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        {description && (
          <p className="text-muted-foreground max-w-[42ch] text-sm">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}

export function ErrorState({
  error,
  onRetry,
}: {
  error?: unknown
  onRetry?: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <AlertCircle className="text-destructive size-8" />
      <p className="text-sm">{t(errorI18nKey(error))}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t('state.retry')}
        </Button>
      )}
    </div>
  )
}

/** 与最终表格形状匹配的骨架行（避免通用转圈）。 */
export function TableSkeleton({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2 p-2">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}
