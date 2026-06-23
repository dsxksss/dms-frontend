/**
 * 状态 / 角色 / 档位 / 列角色 → Badge tone 变体映射。
 * tone 配色 hex 由 design_handoff 原型冻结，集中在此一处，全站统一。
 */
import type { ColumnRole } from '@/api/datasets'

export type Tone =
  | 'success'
  | 'warning'
  | 'info'
  | 'danger'
  | 'neutral'
  | 'purple'
  | 'pink'
  | 'lock'

/** tone → [底色, 文字色]。用于需要内联上色的场景（图标方块 / 列头徽标）。 */
export const TONE_HEX: Record<Tone, readonly [string, string]> = {
  success: ['#E7F6EC', '#15803D'],
  warning: ['#FEF4E6', '#B45309'],
  info: ['#EAF0FF', '#2F6BFF'],
  danger: ['#FDECEC', '#B91C1C'],
  neutral: ['#EEF0F3', '#64748B'],
  purple: ['#EFE9FB', '#6D5BD0'],
  pink: ['#FBEAF2', '#BE185D'],
  lock: ['#FFF3F0', '#E0492C'],
}

/** 资产 / 执行状态：validated·completed=绿，synth=琥珀，in_progress=蓝，failed·aborted=红，其余灰。 */
export function statusTone(status: string): Tone {
  switch (status) {
    case 'validated':
    case 'completed':
      return 'success'
    case 'synth':
      return 'warning'
    case 'in_progress':
      return 'info'
    case 'failed':
    case 'aborted':
      return 'danger'
    default:
      return 'neutral' // pending / draft / 未知
  }
}

/** 项目 / 组织角色：Owner=紫，Manager·admin=蓝，Contributor=绿，Viewer·member=灰。 */
export function roleTone(role: string): Tone {
  switch (role.toLowerCase()) {
    case 'owner':
      return 'purple'
    case 'manager':
    case 'admin':
      return 'info'
    case 'contributor':
      return 'success'
    default:
      return 'neutral' // viewer / member
  }
}

/** 订阅档位：private=品红(私有化)，enterprise=紫，standard=蓝，demo=灰。 */
export function planTone(plan: string): Tone {
  switch (plan) {
    case 'private':
      return 'pink'
    case 'enterprise':
      return 'purple'
    case 'standard':
      return 'info'
    default:
      return 'neutral' // demo
  }
}

/** 数据集列角色：id=蓝，feature=绿，label=品红，ignore=灰。 */
export function columnRoleTone(role: ColumnRole): Tone {
  switch (role) {
    case 'id':
      return 'info'
    case 'feature':
      return 'success'
    case 'label':
      return 'pink'
    default:
      return 'neutral' // ignore
  }
}

/** 平台配置生效方式：restart=琥珀(需重部署)，live=绿(即时)。 */
export function applyTone(apply: string): Tone {
  return apply === 'restart' ? 'warning' : 'success'
}
