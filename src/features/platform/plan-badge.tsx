import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

/** plan 档位 → 徽章配色（中性底锁定，仅用单色深浅区分，不引入花哨色）。 */
const PLAN_CLASS: Record<string, string> = {
  demo: 'bg-muted text-muted-foreground',
  standard: 'bg-brand/10 text-brand border-brand/20',
  enterprise: 'bg-brand text-brand-foreground',
  onprem: 'bg-foreground text-background',
}

export function PlanBadge({ plan }: { plan: string }) {
  const { t } = useTranslation('platform')
  return (
    <Badge
      variant="outline"
      className={cn('border-transparent', PLAN_CLASS[plan] ?? PLAN_CLASS.demo)}
    >
      {t(`plan.${plan}`, { defaultValue: plan })}
    </Badge>
  )
}

/** 配额数值展示：-1 → 不限。 */
export function quotaLabel(value: number, unlimited: string): string {
  return value < 0 ? unlimited : String(value)
}
