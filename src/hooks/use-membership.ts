import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { membershipApi, type InviteBody } from '@/api/membership'

const root = ['membership'] as const

export const membershipKeys = {
  userSearch: (q: string) => [...root, 'users', q] as const,
  projectInvitations: (pid: string) => [...root, 'proj-inv', pid] as const,
  orgInvitations: (oid: string) => [...root, 'org-inv', oid] as const,
  myInvitations: () => [...root, 'my-inv'] as const,
  orgMembers: (oid: string) => [...root, 'org-members', oid] as const,
  myJoinRequests: () => [...root, 'my-jr'] as const,
  orgJoinRequests: (oid: string) => [...root, 'org-jr', oid] as const,
  discoverable: (q: string) => [...root, 'discoverable', q] as const,
}

function useInvalidate() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: root })
    qc.invalidateQueries({ queryKey: ['projects'] })
  }
}

// ---- directory ----
export function useUserSearch(search: string) {
  return useQuery({
    queryKey: membershipKeys.userSearch(search),
    queryFn: () => membershipApi.searchUsers(search),
    enabled: search.trim().length >= 1,
  })
}

/** 解析单个用户卡片（按 id），长缓存、跨组件去重。 */
export function useUser(id: string | null | undefined) {
  return useQuery({
    queryKey: ['membership', 'user', id],
    queryFn: () => membershipApi.getUser(id!),
    enabled: !!id,
    staleTime: 5 * 60_000,
  })
}

// ---- invitations: send / list / revoke ----
export function useProjectInvitations(projectId: string) {
  return useQuery({
    queryKey: membershipKeys.projectInvitations(projectId),
    queryFn: () => membershipApi.listProjectInvitations(projectId),
    enabled: !!projectId,
  })
}

export function useOrgInvitations(orgId: string) {
  return useQuery({
    queryKey: membershipKeys.orgInvitations(orgId),
    queryFn: () => membershipApi.listOrgInvitations(orgId),
    enabled: !!orgId,
  })
}

export function useInviteToProject(projectId: string) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (body: InviteBody) =>
      membershipApi.inviteToProject(projectId, body),
    onSuccess: invalidate,
  })
}

export function useInviteToOrg(orgId: string) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (body: InviteBody) => membershipApi.inviteToOrg(orgId, body),
    onSuccess: invalidate,
  })
}

export function useRevokeInvitation() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: string) => membershipApi.revokeInvitation(id),
    onSuccess: invalidate,
  })
}

// ---- my invitations ----
export function useMyInvitations() {
  return useQuery({
    queryKey: membershipKeys.myInvitations(),
    queryFn: () => membershipApi.myInvitations(),
  })
}

export function useAcceptInvitation() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: string) => membershipApi.acceptInvitation(id),
    onSuccess: invalidate,
  })
}

export function useDeclineInvitation() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: string) => membershipApi.declineInvitation(id),
    onSuccess: invalidate,
  })
}

// ---- org members ----
export function useOrgMembers(orgId: string) {
  return useQuery({
    queryKey: membershipKeys.orgMembers(orgId),
    queryFn: () => membershipApi.listOrgMembers(orgId),
    enabled: !!orgId,
  })
}

export function useSetOrgMemberRole(orgId: string) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      membershipApi.setOrgMemberRole(orgId, userId, role),
    onSuccess: invalidate,
  })
}

export function useRemoveOrgMember(orgId: string) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (userId: string) => membershipApi.removeOrgMember(orgId, userId),
    onSuccess: invalidate,
  })
}

// ---- join requests ----
export function useMyJoinRequests() {
  return useQuery({
    queryKey: membershipKeys.myJoinRequests(),
    queryFn: () => membershipApi.myJoinRequests(),
  })
}

export function useDiscoverable(search: string) {
  return useQuery({
    queryKey: membershipKeys.discoverable(search),
    queryFn: () => membershipApi.listDiscoverable(search || undefined),
  })
}

export function useRequestJoin() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ orgId, message }: { orgId: string; message?: string }) =>
      membershipApi.requestJoin(orgId, message),
    onSuccess: invalidate,
  })
}

export function useCancelJoinRequest() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: string) => membershipApi.cancelJoinRequest(id),
    onSuccess: invalidate,
  })
}

export function useOrgJoinRequests(orgId: string) {
  return useQuery({
    queryKey: membershipKeys.orgJoinRequests(orgId),
    queryFn: () => membershipApi.listOrgJoinRequests(orgId),
    enabled: !!orgId,
  })
}

export function useApproveJoinRequest() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role?: string }) =>
      membershipApi.approveJoinRequest(id, role),
    onSuccess: invalidate,
  })
}

export function useRejectJoinRequest() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: string) => membershipApi.rejectJoinRequest(id),
    onSuccess: invalidate,
  })
}
