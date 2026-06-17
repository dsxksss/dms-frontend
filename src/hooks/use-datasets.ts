import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  datasetsApi,
  type CreateDatasetInput,
  type PreviewParams,
} from '@/api/datasets'

const root = ['datasets'] as const

export const datasetKeys = {
  all: root,
  scope: (projectId: string) => [...root, projectId] as const,
  list: (projectId: string) => [...root, projectId, 'list'] as const,
  detail: (projectId: string, id: string) =>
    [...root, projectId, 'detail', id] as const,
  versions: (projectId: string, id: string) =>
    [...root, projectId, 'versions', id] as const,
  preview: (projectId: string, id: string, params: PreviewParams) =>
    [...root, projectId, 'preview', id, params] as const,
}

function useInvalidate(projectId: string) {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: datasetKeys.scope(projectId) })
}

export function useDatasets(projectId: string) {
  return useQuery({
    queryKey: datasetKeys.list(projectId),
    queryFn: () => datasetsApi.list(projectId),
    enabled: !!projectId,
  })
}

export function useDataset(projectId: string, id: string) {
  return useQuery({
    queryKey: datasetKeys.detail(projectId, id),
    queryFn: () => datasetsApi.get(projectId, id),
    enabled: !!projectId && !!id,
  })
}

export function useCreateDataset(projectId: string) {
  const invalidate = useInvalidate(projectId)
  return useMutation({
    mutationFn: (body: CreateDatasetInput) => datasetsApi.create(projectId, body),
    onSuccess: invalidate,
  })
}

export function useUpdateDataset(projectId: string, id: string) {
  const invalidate = useInvalidate(projectId)
  return useMutation({
    mutationFn: (body: { name?: string; description?: string; version: number }) =>
      datasetsApi.update(projectId, id, body),
    onSuccess: invalidate,
  })
}

export function useDeleteDataset(projectId: string) {
  const invalidate = useInvalidate(projectId)
  return useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) =>
      datasetsApi.remove(projectId, id, version),
    onSuccess: invalidate,
  })
}

export function useDatasetVersions(projectId: string, id: string) {
  return useQuery({
    queryKey: datasetKeys.versions(projectId, id),
    queryFn: () => datasetsApi.listVersions(projectId, id),
    enabled: !!projectId && !!id,
  })
}

export function useUploadVersion(projectId: string, id: string) {
  const invalidate = useInvalidate(projectId)
  return useMutation({
    mutationFn: ({ file, format }: { file: File; format: string }) =>
      datasetsApi.uploadVersion(projectId, id, file, format),
    onSuccess: invalidate,
  })
}

export function useSetColumnRoles(projectId: string, id: string) {
  const invalidate = useInvalidate(projectId)
  return useMutation({
    mutationFn: ({
      versionNo,
      roles,
    }: {
      versionNo: number
      roles: Record<string, string>
    }) => datasetsApi.setColumnRoles(projectId, id, versionNo, roles),
    onSuccess: invalidate,
  })
}

export function useDatasetPreview(
  projectId: string,
  id: string,
  params: PreviewParams,
  enabled = true,
) {
  return useQuery({
    queryKey: datasetKeys.preview(projectId, id, params),
    queryFn: () => datasetsApi.preview(projectId, id, params),
    enabled: enabled && !!projectId && !!id,
  })
}
