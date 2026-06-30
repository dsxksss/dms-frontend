import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { filesApi, foldersApi } from '@/api/files'

const root = (projectId: string) => ['files', projectId] as const

export const fileKeys = {
  list: (pid: string, params: unknown) => [...root(pid), 'list', params] as const,
  summary: (pid: string) => [...root(pid), 'summary'] as const,
  folders: (pid: string) => [...root(pid), 'folders'] as const,
}

export function useFilesSummary(projectId: string) {
  return useQuery({
    queryKey: fileKeys.summary(projectId),
    queryFn: () => filesApi.summary(projectId),
  })
}

/** 持久文件夹树（含空夹 + 直属/子树计数）。 */
export function useFolders(projectId: string) {
  return useQuery({
    queryKey: fileKeys.folders(projectId),
    queryFn: () => foldersApi.list(projectId),
    enabled: !!projectId,
  })
}

export function useCreateFolder(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { category: string; path: string }) =>
      foldersApi.create(projectId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: root(projectId) }),
  })
}

export function useRenameFolder(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { category: string; from_path: string; to_path: string }) =>
      foldersApi.rename(projectId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: root(projectId) }),
  })
}

export function useDeleteFolder(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { category: string; path: string; recursive?: boolean }) =>
      foldersApi.remove(projectId, params),
    onSuccess: () => qc.invalidateQueries({ queryKey: root(projectId) }),
  })
}

export function useMoveFile(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      fileId,
      folder,
      category,
    }: {
      fileId: string
      folder: string
      category?: string
    }) => filesApi.move(projectId, fileId, { folder, category }),
    onSuccess: () => qc.invalidateQueries({ queryKey: root(projectId) }),
  })
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
      confidential,
    }: {
      file: File
      category: string
      folder?: string
      confidential?: boolean
    }) => filesApi.upload(projectId, file, { category, folder, confidential }),
    onSuccess: () => qc.invalidateQueries({ queryKey: root(projectId) }),
  })
}

export function useSetFileConfidential(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, confidential }: { id: string; confidential: boolean }) =>
      filesApi.setConfidential(projectId, id, confidential),
    onSuccess: () => qc.invalidateQueries({ queryKey: root(projectId) }),
  })
}

export function useFileGrants(projectId: string, fileId: string, enabled = true) {
  return useQuery({
    queryKey: [...root(projectId), 'grants', fileId],
    queryFn: () => filesApi.listGrants(projectId, fileId),
    enabled: enabled && !!fileId,
  })
}

export function useGrantFile(projectId: string, fileId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => filesApi.grant(projectId, fileId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: root(projectId) }),
  })
}

export function useRevokeFile(projectId: string, fileId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => filesApi.revoke(projectId, fileId, userId),
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
