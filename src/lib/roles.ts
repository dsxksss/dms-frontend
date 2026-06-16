/** 项目成员角色层级（与后端 ProjectRole 对齐）：Owner > Manager > Contributor > Viewer。 */
export const PROJECT_ROLES = ['viewer', 'contributor', 'manager', 'owner'] as const
export type ProjectRole = (typeof PROJECT_ROLES)[number]

export const ROLE_RANK: Record<ProjectRole, number> = {
  viewer: 0,
  contributor: 1,
  manager: 2,
  owner: 3,
}

/** 当前角色是否达到所需的最低角色。null/undefined（非成员）一律不达标。 */
export function roleAtLeast(
  role: ProjectRole | null | undefined,
  min: ProjectRole,
): boolean {
  if (!role) return false
  return ROLE_RANK[role] >= ROLE_RANK[min]
}
