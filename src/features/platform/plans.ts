import type { TFunction } from 'i18next'
import { formatBytes } from '@/lib/format'

/**
 * 云端 SaaS 可选套餐：demo / standard / enterprise。
 * 私有化(onprem)是独立部署形态，不在云端平台开通，故不作为可选项；
 * 但 PLAN_BASELINE / 徽章仍保留 onprem，以便历史数据里若有该值仍能正常展示。
 */
export const PLAN_OPTIONS = ['demo', 'standard', 'enterprise'] as const
export type PlanTier = 'demo' | 'standard' | 'enterprise' | 'onprem'

const GiB = 1024 ** 3
const TiB = 1024 ** 4

/**
 * 各档默认配额基线（与后端一致；-1=不限）。仅用于详情页"选档自动带出默认值"，
 * 之后可手动微调。最终以后端 PATCH 套用结果为准（后端：传 plan 套基线，显式字段覆盖）。
 */
export const PLAN_BASELINE: Record<
  PlanTier,
  { max_orgs: number; max_users_per_org: number; storage_bytes: number }
> = {
  demo: { max_orgs: 1, max_users_per_org: 20, storage_bytes: 10 * GiB },
  standard: { max_orgs: 5, max_users_per_org: 20, storage_bytes: 100 * GiB },
  enterprise: { max_orgs: 10, max_users_per_org: 1000, storage_bytes: 5 * TiB },
  onprem: { max_orgs: -1, max_users_per_org: -1, storage_bytes: -1 },
}

/** 一句话概括某档包含的配额（组织数 / 每组织人数 / 存储），让套餐不再是空标签。 */
export function planSummary(plan: string, t: TFunction): string {
  const b = PLAN_BASELINE[plan as PlanTier]
  if (!b) return ''
  const num = (n: number) => (n < 0 ? t('unlimited') : String(n))
  const storage = b.storage_bytes < 0 ? t('unlimited') : formatBytes(b.storage_bytes)
  return t('plan.summary', {
    orgs: num(b.max_orgs),
    users: num(b.max_users_per_org),
    storage,
  })
}
