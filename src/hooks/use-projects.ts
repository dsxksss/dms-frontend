import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  projectsApi,
  type CreateProjectInput,
  type ListProjectsParams,
  type UpdateProjectInput,
} from '@/api/projects'
import { useAuth } from '@/auth/auth-context'
import type { ProjectRole } from '@/lib/roles'

export const projectKeys = {
  all: ['projects'] as const,
  list: (p: ListProjectsParams) => ['projects', 'list', p] as const,
  detail: (id: string) => ['projects', 'detail', id] as const,
  members: (id: string) => ['projects', id, 'members'] as const,
}

export function useProjects(params: ListProjectsParams, enabled = true) {
  return useQuery({
    queryKey: projectKeys.list(params),
    queryFn: () => projectsApi.list(params),
    enabled,
  })
}

export function useProject(id: string) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => projectsApi.get(id),
  })
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateProjectInput) => projectsApi.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: projectKeys.all }),
  })
}

export function useUpdateProject(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateProjectInput) => projectsApi.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: projectKeys.all }),
  })
}

export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) =>
      projectsApi.remove(id, version),
    onSuccess: () => qc.invalidateQueries({ queryKey: projectKeys.all }),
  })
}

export function useSetArchived() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) =>
      archived ? projectsApi.archive(id) : projectsApi.unarchive(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: projectKeys.all }),
  })
}

export function useMembers(id: string, enabled = true) {
  return useQuery({
    queryKey: projectKeys.members(id),
    queryFn: () => projectsApi.members(id),
    enabled: enabled && !!id,
  })
}

export function useRemoveMember(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => projectsApi.removeMember(id, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: projectKeys.members(id) }),
  })
}

/** 改已有成员角色（Manager）。 */
export function useSetMemberRole(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: ProjectRole }) =>
      projectsApi.setMemberRole(id, userId, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: projectKeys.members(id) }),
  })
}

export function useShares(id: string) {
  return useQuery({
    queryKey: ['projects', id, 'shares'],
    queryFn: () => projectsApi.listShares(id),
  })
}

export function useAddShare(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { org_id?: string; role?: ProjectRole }) =>
      projectsApi.addShare(id, body),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['projects', id, 'shares'] }),
  })
}

export function useRemoveShare(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (shareId: string) => projectsApi.removeShare(id, shareId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['projects', id, 'shares'] }),
  })
}

// ---- 申请加入（组织内可见项目）----

/** 某项目的待审批申请列表（项目 Manager 可见）。 */
export function useProjectJoinRequests(id: string, enabled = true) {
  return useQuery({
    queryKey: ['projects', id, 'join-requests'],
    queryFn: () => projectsApi.listJoinRequests(id, 'pending'),
    enabled,
  })
}

/** 当前用户自己发起的项目申请（用于在项目卡片上显示「申请中」）。 */
export function useMyProjectJoinRequests() {
  return useQuery({
    queryKey: ['projects', 'my-join-requests'],
    queryFn: () => projectsApi.myJoinRequests('pending'),
  })
}

/** 收件箱聚合：我有权审批的待处理申请（跨我管理的所有项目）。 */
export function useIncomingProjectJoinRequests() {
  return useQuery({
    queryKey: ['projects', 'incoming-join-requests'],
    queryFn: () => projectsApi.incomingJoinRequests(),
  })
}

/** 收件箱内审批：批准/拒绝后刷新聚合列表（不绑定单一 projectId）。 */
export function useDecideIncomingJoinRequest() {
  const qc = useQueryClient()
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['projects', 'incoming-join-requests'] })
    qc.invalidateQueries({ queryKey: projectKeys.all })
  }
  const approve = useMutation({
    mutationFn: ({ reqId, role }: { reqId: string; role: ProjectRole }) =>
      projectsApi.approveJoinRequest(reqId, role),
    onSuccess: invalidate,
  })
  const reject = useMutation({
    mutationFn: (reqId: string) => projectsApi.rejectJoinRequest(reqId),
    onSuccess: invalidate,
  })
  return { approve, reject }
}

export function useRequestJoinProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, message }: { id: string; message?: string }) =>
      projectsApi.requestJoin(id, message ?? ''),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['projects', 'my-join-requests'] }),
  })
}

export function useApproveProjectJoinRequest(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ reqId, role }: { reqId: string; role: ProjectRole }) =>
      projectsApi.approveJoinRequest(reqId, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects', projectId, 'join-requests'] })
      qc.invalidateQueries({ queryKey: projectKeys.members(projectId) })
    },
  })
}

export function useRejectProjectJoinRequest(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (reqId: string) => projectsApi.rejectJoinRequest(reqId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['projects', projectId, 'join-requests'] }),
  })
}

export function useCancelProjectJoinRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (reqId: string) => projectsApi.cancelJoinRequest(reqId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['projects', 'my-join-requests'] }),
  })
}

/** 当前用户在该项目的成员角色（用于资源级 UI 门禁）。加载中或非成员返回 null。 */
export function useProjectRole(projectId?: string): ProjectRole | null {
  const { me } = useAuth()
  const { data } = useMembers(projectId ?? '', !!projectId)
  if (!me?.user_id || !data) return null
  return data.find((m) => m.user_id === me.user_id)?.role ?? null
}
