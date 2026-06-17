import { useQuery } from '@tanstack/react-query'
import { systemDatasetsApi, type PreviewParams } from '@/api/datasets'

const root = ['public-datasets'] as const

export const publicDatasetKeys = {
  list: () => [...root, 'list'] as const,
  versions: (id: string) => [...root, 'versions', id] as const,
  preview: (id: string, params: PreviewParams) =>
    [...root, 'preview', id, params] as const,
}

export function usePublicDatasets() {
  return useQuery({
    queryKey: publicDatasetKeys.list(),
    queryFn: () => systemDatasetsApi.list(),
  })
}

export function usePublicDatasetVersions(id: string) {
  return useQuery({
    queryKey: publicDatasetKeys.versions(id),
    queryFn: () => systemDatasetsApi.listVersions(id),
    enabled: !!id,
  })
}

export function usePublicDatasetPreview(
  id: string,
  params: PreviewParams,
  enabled = true,
) {
  return useQuery({
    queryKey: publicDatasetKeys.preview(id, params),
    queryFn: () => systemDatasetsApi.preview(id, params),
    enabled: enabled && !!id,
  })
}
