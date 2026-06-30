import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  datasetsApi,
  type CreateDatasetInput,
  type DatasetMeta,
  type DatasetScope,
  type FromRegistryInput,
  type PreviewParams,
} from '@/api/datasets'

const root = ['datasets'] as const

export const datasetKeys = {
  all: root,
  scope: (scope: DatasetScope) => [...root, scopeKey(scope)] as const,
  list: (scope: DatasetScope, tag?: string) =>
    [...root, scopeKey(scope), 'list', tag ?? null] as const,
  tags: (scope: DatasetScope) => [...root, scopeKey(scope), 'tags'] as const,
  detail: (scope: DatasetScope, id: string) =>
    [...root, scopeKey(scope), 'detail', id] as const,
  versions: (scope: DatasetScope, id: string) =>
    [...root, scopeKey(scope), 'versions', id] as const,
  lineage: (projectId: string, id: string) =>
    [...root, projectId, 'lineage', id] as const,
  preview: (scope: DatasetScope, id: string, params: PreviewParams) =>
    [...root, scopeKey(scope), 'preview', id, params] as const,
}

function scopeKey(scope: DatasetScope) {
  return typeof scope === 'string' ? `project:${scope}` : `${scope.type}:${scope.id}`
}

function scopeEnabled(scope: DatasetScope) {
  return typeof scope === 'string' ? !!scope : !!scope.id
}

function useInvalidate(scope: DatasetScope) {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: datasetKeys.scope(scope) })
}

export function useDatasets(scope: DatasetScope, tag?: string) {
  return useQuery({
    queryKey: datasetKeys.list(scope, tag),
    queryFn: () => datasetsApi.list(scope, tag),
    enabled: scopeEnabled(scope),
  })
}

/** 该项目数据集去重标签集合（左侧导航过滤用）。 */
export function useDatasetTags(scope: DatasetScope) {
  return useQuery({
    queryKey: datasetKeys.tags(scope),
    queryFn: () => datasetsApi.listTags(scope),
    enabled: scopeEnabled(scope),
  })
}

export function useDataset(scope: DatasetScope, id: string) {
  return useQuery({
    queryKey: datasetKeys.detail(scope, id),
    queryFn: () => datasetsApi.get(scope, id),
    enabled: scopeEnabled(scope) && !!id,
  })
}

export function useCreateDataset(scope: DatasetScope) {
  const invalidate = useInvalidate(scope)
  return useMutation({
    mutationFn: (body: CreateDatasetInput) => datasetsApi.create(scope, body),
    onSuccess: () => {
      invalidate()
    },
  })
}

export function useUpdateDataset(scope: DatasetScope, id: string) {
  const invalidate = useInvalidate(scope)
  return useMutation({
    mutationFn: (
      body: { name?: string; description?: string; version: number } & DatasetMeta,
    ) => datasetsApi.update(scope, id, body),
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

export function useDeleteDataset(scope: DatasetScope) {
  const invalidate = useInvalidate(scope)
  return useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) =>
      datasetsApi.remove(scope, id, version),
    onSuccess: invalidate,
  })
}

export function useDatasetVersions(scope: DatasetScope, id: string) {
  return useQuery({
    queryKey: datasetKeys.versions(scope, id),
    queryFn: () => datasetsApi.listVersions(scope, id),
    enabled: scopeEnabled(scope) && !!id,
  })
}

export function useUploadVersion(scope: DatasetScope, id: string) {
  const invalidate = useInvalidate(scope)
  return useMutation({
    mutationFn: ({ file, format }: { file: File; format: string }) =>
      datasetsApi.uploadVersion(scope, id, file, format),
    onSuccess: invalidate,
  })
}

export function useSetColumnRoles(scope: DatasetScope, id: string) {
  const invalidate = useInvalidate(scope)
  return useMutation({
    mutationFn: ({
      versionNo,
      roles,
    }: {
      versionNo: number
      roles: Record<string, string>
    }) => datasetsApi.setColumnRoles(scope, id, versionNo, roles),
    onSuccess: invalidate,
  })
}

export function useDatasetPreview(
  scope: DatasetScope,
  id: string,
  params: PreviewParams,
  enabled = true,
) {
  return useQuery({
    queryKey: datasetKeys.preview(scope, id, params),
    queryFn: () => datasetsApi.preview(scope, id, params),
    enabled: enabled && scopeEnabled(scope) && !!id,
  })
}
