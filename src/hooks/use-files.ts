import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { filesApi } from '@/api/files'

const root = (projectId: string) => ['files', projectId] as const

export const fileKeys = {
  list: (pid: string, params: unknown) => [...root(pid), 'list', params] as const,
}

export function useFiles(
  projectId: string,
  params: { category?: string; folder?: string; limit?: number; offset?: number },
) {
  return useQuery({
    queryKey: fileKeys.list(projectId, params),
    queryFn: () => filesApi.list(projectId, params),
  })
}

export function useUploadFile(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      file,
      category,
      folder,
    }: {
      file: File
      category: string
      folder?: string
    }) => filesApi.upload(projectId, file, { category, folder }),
    onSuccess: () => qc.invalidateQueries({ queryKey: root(projectId) }),
  })
}

export function useDeleteFile(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (fileId: string) => filesApi.remove(projectId, fileId),
    onSuccess: () => qc.invalidateQueries({ queryKey: root(projectId) }),
  })
}
