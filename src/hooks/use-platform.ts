import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { platformApi } from '@/platform/api'
import type { CreateTenantBody, UpdateTenantBody } from '@/platform/api'
import type { PageQuery } from '@/api/types'

const root = ['platform'] as const

export const platformKeys = {
  stats: () => [...root, 'stats'] as const,
  license: () => [...root, 'license'] as const,
  tenants: (params: PageQuery) => [...root, 'tenants', params] as const,
  tenant: (id: string) => [...root, 'tenant', id] as const,
  settings: () => [...root, 'settings'] as const,
}

export function usePlatformStats() {
  return useQuery({ queryKey: platformKeys.stats(), queryFn: () => platformApi.stats() })
}

export function usePlatformLicense() {
  return useQuery({ queryKey: platformKeys.license(), queryFn: () => platformApi.license() })
}

export function useTenants(params: PageQuery) {
  return useQuery({
    queryKey: platformKeys.tenants(params),
    queryFn: () => platformApi.listTenants(params),
  })
}

export function useTenantDetail(id: string) {
  return useQuery({
    queryKey: platformKeys.tenant(id),
    queryFn: () => platformApi.getTenant(id),
    enabled: !!id,
  })
}

export function useCreateTenant() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateTenantBody) => platformApi.createTenant(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: root }),
  })
}

export function useUpdateTenant(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateTenantBody) => platformApi.updateTenant(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: root }),
  })
}

export function useSetTenantActive(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (active: boolean) =>
      active ? platformApi.activate(id) : platformApi.suspend(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: root }),
  })
}

export function usePlatformDatasets() {
  return useQuery({
    queryKey: [...root, 'datasets'],
    queryFn: () => platformApi.listDatasets(),
  })
}

export function useCreatePlatformDataset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string; description?: string }) =>
      platformApi.createDataset(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...root, 'datasets'] }),
  })
}

export function useUploadPlatformDatasetVersion(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ file, format }: { file: File; format: string }) =>
      platformApi.uploadDatasetVersion(id, file, format),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...root, 'datasets'] }),
  })
}

export function useDeletePlatformDataset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => platformApi.deleteDataset(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...root, 'datasets'] }),
  })
}

export function usePlatformSettings() {
  return useQuery({
    queryKey: platformKeys.settings(),
    queryFn: () => platformApi.settings(),
  })
}

export function useUpdatePlatformSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      platformApi.updateSettings(body),
    onSuccess: (data) => qc.setQueryData(platformKeys.settings(), data),
  })
}
