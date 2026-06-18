import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notebookApi } from '@/api/notebook'

const root = (projectId: string) => ['notebook', projectId] as const

export const notebookKeys = {
  list: (projectId: string, params: Record<string, unknown>) =>
    [...root(projectId), 'list', params] as const,
  entry: (projectId: string, id: string) =>
    [...root(projectId), 'entry', id] as const,
}

export function useNotebookEntries(
  projectId: string,
  params: { include_archived?: boolean } = {},
) {
  return useQuery({
    queryKey: notebookKeys.list(projectId, params),
    queryFn: () => notebookApi.list(projectId, params),
    enabled: !!projectId,
  })
}

export function useCreateNotebookEntry(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { title: string; content?: string }) =>
      notebookApi.create(projectId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: root(projectId) }),
  })
}

export function useUpdateNotebookEntry(projectId: string, id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { title?: string; content?: string; version: number }) =>
      notebookApi.update(projectId, id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: root(projectId) }),
  })
}

export function useDeleteNotebookEntry(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) =>
      notebookApi.remove(projectId, id, version),
    onSuccess: () => qc.invalidateQueries({ queryKey: root(projectId) }),
  })
}

export function useArchiveNotebookEntry(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) =>
      notebookApi.setArchived(projectId, id, archived),
    onSuccess: () => qc.invalidateQueries({ queryKey: root(projectId) }),
  })
}
