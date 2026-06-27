import { useTranslation } from 'react-i18next'
import { Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * 敏感字段脱敏占位：默认以 •••••• 代替（不显示「申请查看」）。
 * 后端对无权用户返回空值，前端一律以此呈现。
 */
export function MaskedValue({ className }: { className?: string }) {
  const { t } = useTranslation('registry')
  return (
    <span
      title={t('entities.hidden')}
      className={cn(
        'mono inline-flex items-center gap-1 text-[12.5px] text-muted-foreground',
        className,
      )}
    >
      ••••••
      <Lock className="size-3 opacity-55" />
    </span>
  )
}
