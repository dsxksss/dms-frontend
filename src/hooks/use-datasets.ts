import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  datasetsApi,
  type CreateDatasetInput,
  type DatasetMeta,
  type FromRegistryInput,
  type PreviewParams,
} from '@/api/datasets'
import { markOnboard } from '@/features/onboarding/flags'

const root = ['datasets'] as const

export const datasetKeys = {
  all: root,
  scope: (projectId: string) => [...root, projectId] as const,
  list: (projectId: string, tag?: string) =>
    [...root, projectId, 'list', tag ?? null] as const,
  tags: (projectId: string) => [...root, projectId, 'tags'] as const,
  detail: (projectId: string, id: string) =>
    [...root, projectId, 'detail', id] as const,
  versions: (projectId: string, id: string) =>
    [...root, projectId, 'versions', id] as const,
  lineage: (projectId: string, id: string) =>
    [...root, projectId, 'lineage', id] as const,
  preview: (projectId: string, id: string, params: PreviewParams) =>
    [...root, projectId, 'preview', id, params] as const,
}

function useInvalidate(projectId: string) {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: datasetKeys.scope(projectId) })
}

export function useDatasets(projectId: string, tag?: string) {
  return useQuery({
    queryKey: datasetKeys.list(projectId, tag),
    queryFn: () => datasetsApi.list(projectId, tag),
    enabled: !!projectId,
  })
}

/** 该项目数据集去重标签集合（左侧导航过滤用）。 */
export function useDatasetTags(projectId: string) {
  return useQuery({
    queryKey: datasetKeys.tags(projectId),
    queryFn: () => datasetsApi.listTags(projectId),
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
    onSuccess: () => {
      invalidate()
      markOnboard('dataset') // 快速上手清单：标记「生成数据集」完成
    },
  })
}

export function useUpdateDataset(projectId: string, id: string) {
  const invalidate = useInvalidate(projectId)
  return useMutation({
    mutationFn: (
      body: { name?: string; description?: string; version: number } & DatasetMeta,
    ) => datasetsApi.update(projectId, id, body),
    onSuccess: invalidate,
  })
}

/** 数据转数据集（from-registry）。 */
export function useDatasetFromRegistry(projectId: string) {
  const invalidate = useInvalidate(projectId)
  return useMutation({
    mutationFn: (body: FromRegistryInput) =>
      datasetsApi.fromRegistry(projectId, body),
    onSuccess: () => {
      invalidate()
      markOnboard('dataset')
    },
  })
}

/** 数据集溯源（derived_from）。 */
export function useDatasetLineage(projectId: string, id: string) {
  return useQuery({
    queryKey: datasetKeys.lineage(projectId, id),
    queryFn: () => datasetsApi.lineage(projectId, id),
    enabled: !!projectId && !!id,
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
