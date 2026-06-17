import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { orgsApi, type GrantRequest } from '@/api/orgs'
import { useAuth, hasPerm } from '@/auth/auth-context'

const root = ['orgs'] as const

export const orgKeys = {
  list: () => [...root, 'list'] as const,
  teams: (orgId: string) => [...root, 'teams', orgId] as const,
}

export function useOrgs() {
  return useQuery({ queryKey: orgKeys.list(), queryFn: () => orgsApi.listOrgs() })
}

/**
 * 当前用户是否拥有至少一个组织。前台据此**动态显示**组织/审计等管理入口：
 * 普通个人用户（无组织）只看到项目/数据集等基础功能；被邀请进组织或拥有组织后，
 * 组织相关入口自动出现。无需单独的「企业管理后台」。
 */
export function useHasOrgs(): boolean {
  const { me } = useAuth()
  const canRead = hasPerm(me, 'org:read')
  const orgs = useQuery({
    queryKey: orgKeys.list(),
    queryFn: () => orgsApi.listOrgs(),
    enabled: canRead,
  })
  return canRead && (orgs.data?.length ?? 0) > 0
}

export function useCreateOrg() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { slug: string; name: string }) => orgsApi.createOrg(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: root }),
  })
}

export function useTeams(orgId: string) {
  return useQuery({
    queryKey: orgKeys.teams(orgId),
    queryFn: () => orgsApi.listTeams(orgId),
    enabled: !!orgId,
  })
}

export function useCreateTeam(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { slug: string; name: string }) =>
      orgsApi.createTeam({ organization_id: orgId, ...body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: orgKeys.teams(orgId) }),
  })
}

export function useGrantRole() {
  return useMutation({ mutationFn: (body: GrantRequest) => orgsApi.grantRole(body) })
}
