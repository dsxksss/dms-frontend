import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { planTone } from '@/lib/tone'

/** plan 档位 → 徽章 tone（demo 中性 / standard 蓝 / enterprise 紫 / onprem 绿）。 */
export function PlanBadge({ plan }: { plan: string }) {
  const { t } = useTranslation('platform')
  return (
    <Badge variant={planTone(plan)}>
      {t(`plan.${plan}`, { defaultValue: plan })}
    </Badge>
  )
}

/** 配额数值展示：-1 → 不限。 */
export function quotaLabel(value: number, unlimited: string): string {
  return value < 0 ? unlimited : String(value)
}
