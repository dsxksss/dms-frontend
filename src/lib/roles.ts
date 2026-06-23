/** 项目成员角色层级（与后端 ProjectRole 对齐）：Owner > Manager > Contributor > Viewer。 */
export const PROJECT_ROLES = ['viewer', 'contributor', 'manager', 'owner'] as const
export type ProjectRole = (typeof PROJECT_ROLES)[number]

export const ROLE_RANK: Record<ProjectRole, number> = {
  viewer: 0,
  contributor: 1,
  manager: 2,
  owner: 3,
}

/**
 * 可经 `/v1/role-grants` 授予的作用域角色 key（role_key 下拉的单一信源）。
 * `auditor`=审计管理员（仅 `audit:read`，对齐后端 FR-AUDIT 职责分离）。
 */
export const GRANTABLE_ROLES = [
  'owner',
  'admin',
  'manager',
  'contributor',
  'viewer',
  'member',
  'auditor',
] as const
export type GrantableRole = (typeof GRANTABLE_ROLES)[number]

/** 当前角色是否达到所需的最低角色。null/undefined（非成员）一律不达标。 */
export function roleAtLeast(
  role: ProjectRole | null | undefined,
  min: ProjectRole,
): boolean {
  if (!role) return false
  return ROLE_RANK[role] >= ROLE_RANK[min]
}
