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
 * 可经 `/v1/role-grants` 授予的**租户 RBAC 角色** key（role_key 下拉的单一信源）。
 * 必须与后端 seed.rs DEFAULT_ROLES 一致——后端按 `roles` 表校验，未知 key 报
 * `seed role not found`。当前仅 4 个：owner / admin / member / auditor。
 * 注：manager / contributor / viewer 是**项目成员角色**（另一套，经项目成员管理设置），
 * 不在此列——它们不是 role-grants 可授予的租户角色。
 */
export const GRANTABLE_ROLES = ['owner', 'admin', 'member', 'auditor'] as const
export type GrantableRole = (typeof GRANTABLE_ROLES)[number]

/** 当前角色是否达到所需的最低角色。null/undefined（非成员）一律不达标。 */
export function roleAtLeast(
  role: ProjectRole | null | undefined,
  min: ProjectRole,
): boolean {
  if (!role) return false
  return ROLE_RANK[role] >= ROLE_RANK[min]
}
