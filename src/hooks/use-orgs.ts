import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { orgsApi, type GrantRequest } from '@/api/orgs'

const root = ['orgs'] as const

export const orgKeys = {
  list: () => [...root, 'list'] as const,
  teams: (orgId: string) => [...root, 'teams', orgId] as const,
}

export function useOrgs() {
  return useQuery({ queryKey: orgKeys.list(), queryFn: () => orgsApi.listOrgs() })
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
