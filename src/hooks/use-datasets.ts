import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  datasetsApi,
  type CreateDatasetInput,
  type PreviewParams,
  type Visibility,
} from '@/api/datasets'

const root = ['datasets'] as const

export const datasetKeys = {
  all: root,
  list: () => [...root, 'list'] as const,
  detail: (id: string) => [...root, 'detail', id] as const,
  versions: (id: string) => [...root, 'versions', id] as const,
  preview: (id: string, params: PreviewParams) =>
    [...root, 'preview', id, params] as const,
  links: (id: string) => [...root, 'links', id] as const,
}

function useInvalidate() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: root })
}

export function useDatasets() {
  return useQuery({ queryKey: datasetKeys.list(), queryFn: () => datasetsApi.list() })
}

export function useDataset(id: string) {
  return useQuery({
    queryKey: datasetKeys.detail(id),
    queryFn: () => datasetsApi.get(id),
    enabled: !!id,
  })
}

export function useCreateDataset() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (body: CreateDatasetInput) => datasetsApi.create(body),
    onSuccess: invalidate,
  })
}

export function useUpdateDataset(id: string) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (body: {
      name?: string
      description?: string
      visibility?: Visibility
      version: number
    }) => datasetsApi.update(id, body),
    onSuccess: invalidate,
  })
}

export function useDeleteDataset() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) =>
      datasetsApi.remove(id, version),
    onSuccess: invalidate,
  })
}

export function useDatasetVersions(id: string) {
  return useQuery({
    queryKey: datasetKeys.versions(id),
    queryFn: () => datasetsApi.listVersions(id),
    enabled: !!id,
  })
}

export function useUploadVersion(id: string) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ file, format }: { file: File; format: string }) =>
      datasetsApi.uploadVersion(id, file, format),
    onSuccess: invalidate,
  })
}

export function useSetColumnRoles(id: string) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({
      versionNo,
      roles,
    }: {
      versionNo: number
      roles: Record<string, string>
    }) => datasetsApi.setColumnRoles(id, versionNo, roles),
    onSuccess: invalidate,
  })
}

export function useDatasetPreview(id: string, params: PreviewParams, enabled = true) {
  return useQuery({
    queryKey: datasetKeys.preview(id, params),
    queryFn: () => datasetsApi.preview(id, params),
    enabled: enabled && !!id,
  })
}

export function useDatasetLinks(id: string) {
  return useQuery({
    queryKey: datasetKeys.links(id),
    queryFn: () => datasetsApi.listLinks(id),
    enabled: !!id,
  })
}

export function useAddLink(id: string) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (body: { entity_id: string; kind: string }) =>
      datasetsApi.addLink(id, body),
    onSuccess: invalidate,
  })
}

export function useDeleteLink(id: string) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (linkId: string) => datasetsApi.deleteLink(id, linkId),
    onSuccess: invalidate,
  })
}
