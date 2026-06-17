import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { orgsApi, type GrantRequest } from '@/api/orgs'
import { useAuth, isAdmin } from '@/auth/auth-context'

const root = ['orgs'] as const

export const orgKeys = {
  list: () => [...root, 'list'] as const,
  teams: (orgId: string) => [...root, 'teams', orgId] as const,
}

export function useOrgs() {
  return useQuery({ queryKey: orgKeys.list(), queryFn: () => orgsApi.listOrgs() })
}

/**
 * 能否进入企业管理后台：需有管理权限 **且** 至少有一个组织。
 * 个人自助注册用户是自己工作区的 owner（含 org:write 等），但没有任何组织，
 * 对他们「后台管理」无意义，故一并以"有无组织"把关——建了组织后自动开放。
 */
export function useAdminAccess() {
  const { me } = useAuth()
  const admin = isAdmin(me)
  const orgs = useQuery({
    queryKey: orgKeys.list(),
    queryFn: () => orgsApi.listOrgs(),
    enabled: admin,
  })
  return {
    isAdmin: admin,
    loading: admin && orgs.isLoading,
    hasOrgs: (orgs.data?.length ?? 0) > 0,
    canAccess: admin && (orgs.data?.length ?? 0) > 0,
  }
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
