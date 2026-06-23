import { useQuery } from '@tanstack/react-query'
import { systemDatasetsApi, type PreviewParams } from '@/api/datasets'

const root = ['public-datasets'] as const

export const publicDatasetKeys = {
  list: (tag?: string) => [...root, 'list', tag ?? null] as const,
  tags: () => [...root, 'tags'] as const,
  versions: (id: string) => [...root, 'versions', id] as const,
  preview: (id: string, params: PreviewParams) =>
    [...root, 'preview', id, params] as const,
}

export function usePublicDatasets(tag?: string) {
  return useQuery({
    queryKey: publicDatasetKeys.list(tag),
    queryFn: () => systemDatasetsApi.list(tag),
  })
}

/** 系统数据集去重标签集合（左侧导航过滤用）。 */
export function usePublicDatasetTags() {
  return useQuery({
    queryKey: publicDatasetKeys.tags(),
    queryFn: () => systemDatasetsApi.listTags(),
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
