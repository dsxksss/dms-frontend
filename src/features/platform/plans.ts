import type { TFunction } from 'i18next'

/**
 * 订阅档位元数据：各档默认配额基线（与后端 PATCH 套档逻辑保持一致的展示口径）。
 * -1 = 不限。仅用于前端展示/预填，真实配额以租户记录为准。
 */
export interface PlanQuota {
  /** 组织数上限。 */
  maxOrgs: number
  /** 每组织人数上限。 */
  maxUsersPerOrg: number
  /** 存储配额（字节）。 */
  storageBytes: number
}

const GB = 1024 ** 3
const TB = 1024 ** 4

/** 可开通的档位（开通对话框下拉用）。 */
export const PLAN_OPTIONS = ['demo', 'standard', 'enterprise', 'private'] as const
export type PlanId = (typeof PLAN_OPTIONS)[number]

/** 各档默认配额基线。 */
export const PLAN_QUOTAS: Record<string, PlanQuota> = {
  demo: { maxOrgs: 3, maxUsersPerOrg: 20, storageBytes: 10 * GB },
  standard: { maxOrgs: 5, maxUsersPerOrg: 20, storageBytes: 100 * GB },
  enterprise: { maxOrgs: 10, maxUsersPerOrg: 1000, storageBytes: 5 * TB },
  private: { maxOrgs: 20, maxUsersPerOrg: 1000, storageBytes: 5 * TB },
}

/** 档位本地化名（platform.plan.*，未知档原样回退）。 */
export function planLabel(plan: string, t: TFunction): string {
  return t(`plan.${plan}`, { defaultValue: plan })
}
