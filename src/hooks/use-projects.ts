import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  projectsApi,
  type CreateProjectInput,
  type ListProjectsParams,
  type Member,
  type UpdateProjectInput,
} from '@/api/projects'

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

export function useAddMember(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Member) => projectsApi.addMember(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: projectKeys.members(id) }),
  })
}

export function useRemoveMember(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => projectsApi.removeMember(id, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: projectKeys.members(id) }),
  })
}
