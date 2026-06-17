/** 套餐档位（与后端 plan tiers 对齐：demo / standard / enterprise / onprem）。 */
export const PLAN_OPTIONS = ['demo', 'standard', 'enterprise', 'onprem'] as const
export type PlanTier = (typeof PLAN_OPTIONS)[number]

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
