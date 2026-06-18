/**
 * 状态 / 角色 / 档位 → Badge tone 变体映射。
 * tone 的具体配色见 components/ui/badge.tsx（来自 design_handoff 冻结的设计 token）。
 * 组件用法：<Badge variant={roleTone(role)}>…</Badge>
 */

export type Tone =
  | 'success'
  | 'warning'
  | 'info'
  | 'danger'
  | 'neutral'
  | 'purple'
  | 'pink'
  | 'lock'

/** 资产/记录状态、执行(Run)状态 → tone。未知键回退 neutral。 */
export function statusTone(status?: string | null): Tone {
  switch ((status ?? '').toLowerCase()) {
    case 'validated':
    case 'completed':
    case 'active':
    case 'approved':
      return 'success'
    case 'synth':
    case 'synthesizing':
    case 'in_review':
    case 'reviewed':
      return 'warning'
    case 'in_progress':
    case 'running':
      return 'info'
    case 'failed':
    case 'aborted':
    case 'rejected':
    case 'suspended':
      return 'danger'
    case 'draft':
    case 'pending':
    default:
      return 'neutral'
  }
}

/** 项目成员角色 / 组织角色 → tone。 */
export function roleTone(role?: string | null): Tone {
  switch ((role ?? '').toLowerCase()) {
    case 'owner':
      return 'purple'
    case 'manager':
    case 'admin':
      return 'info'
    case 'contributor':
      return 'success'
    case 'viewer':
    case 'member':
    default:
      return 'neutral'
  }
}

/** 订阅档位 → tone。 */
export function planTone(plan?: string | null): Tone {
  switch ((plan ?? '').toLowerCase()) {
    case 'enterprise':
      return 'purple'
    case 'standard':
      return 'info'
    case 'onprem':
      return 'success'
    case 'demo':
    default:
      return 'neutral'
  }
}
