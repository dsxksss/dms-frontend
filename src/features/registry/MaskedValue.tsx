import { Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/**
 * 敏感字段无权查看时的**脱敏占位**：muted `••••••` + 小锁图标，
 * 替代醒目的「已隐藏」红色 chip——更像被遮罩的值而非缺省。hover 显「已隐藏」。
 */
export function MaskedValue({ className }: { className?: string }) {
  const { t } = useTranslation('registry')
  return (
    <span
      title={t('entities.hidden')}
      className={
        'text-muted-foreground inline-flex items-center gap-1 font-mono ' +
        (className ?? '')
      }
    >
      <Lock className="size-3 shrink-0" />
      ••••••
    </span>
  )
}
