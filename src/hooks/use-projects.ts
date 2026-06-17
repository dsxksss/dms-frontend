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

export function useProjects(params: ListProjectsParams) {
  return useQuery({
    queryKey: projectKeys.list(params),
    queryFn: () => projectsApi.list(params),
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

export function useMembers(id: string) {
  return useQuery({
    queryKey: projectKeys.members(id),
    queryFn: () => projectsApi.members(id),
  })
}

export function useRemoveMember(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => projectsApi.removeMember(id, userId),
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

/** 当前用户在该项目的成员角色（用于资源级 UI 门禁）。加载中或非成员返回 null。 */
export function useProjectRole(projectId: string): ProjectRole | null {
  const { me } = useAuth()
  const { data } = useMembers(projectId)
  if (!me?.user_id || !data) return null
  return data.find((m) => m.user_id === me.user_id)?.role ?? null
}
