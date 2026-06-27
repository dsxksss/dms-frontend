import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { planTone } from '@/components/tone'
import { planLabel } from './plans'

/** 档位徽标：tone 由 planTone 决定，文案本地化（platform.plan.*）。 */
export function PlanBadge({ plan }: { plan: string }) {
  const { t } = useTranslation('platform')
  return <Badge variant={planTone(plan)}>{planLabel(plan, t)}</Badge>
}
