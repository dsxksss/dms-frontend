import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { orgRegistryApi } from '@/api/org-registry'
import type { CreateTypeBody, TypeKind } from '@/api/registry'

const root = (orgId: string) => ['org-registry', orgId] as const

export const orgRegistryKeys = {
  scope: (orgId: string) => root(orgId),
  types: (orgId: string) => [...root(orgId), 'types'] as const,
  records: (orgId: string, params: unknown) =>
    [...root(orgId), 'records', params] as const,
}

function useInvalidate(orgId: string) {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: root(orgId) })
}

/** 组织级类型列表（资产类型 + 数据模版，各带 kind）。 */
export function useOrgTypes(orgId: string) {
  return useQuery({
    queryKey: orgRegistryKeys.types(orgId),
    queryFn: () => orgRegistryApi.listTypes(orgId),
    enabled: !!orgId,
  })
}

export function useCreateOrgType(orgId: string, kind: TypeKind) {
  const invalidate = useInvalidate(orgId)
  return useMutation({
    mutationFn: (body: CreateTypeBody) =>
      orgRegistryApi.createType(orgId, kind, body),
    onSuccess: invalidate,
  })
}

export function useOrgRecords(
  orgId: string,
  kind: TypeKind,
  params: { type?: string; contains?: string; limit?: number; offset?: number },
  enabled = true,
) {
  return useQuery({
    queryKey: orgRegistryKeys.records(orgId, { kind, ...params }),
    queryFn: () => orgRegistryApi.listRecords(orgId, kind, params),
    enabled: enabled && !!orgId && !!params.type,
  })
}

export function useCreateOrgRecord(orgId: string, kind: TypeKind) {
  const invalidate = useInvalidate(orgId)
  return useMutation({
    mutationFn: (body: { type_id: string; data: Record<string, unknown> }) =>
      orgRegistryApi.createRecord(orgId, kind, body),
    onSuccess: invalidate,
  })
}

export function useUpdateOrgRecord(orgId: string, kind: TypeKind, rid: string) {
  const invalidate = useInvalidate(orgId)
  return useMutation({
    mutationFn: (body: { data: Record<string, unknown>; version: number }) =>
      orgRegistryApi.updateRecord(orgId, kind, rid, body),
    onSuccess: invalidate,
  })
}

export function useDeleteOrgRecord(orgId: string, kind: TypeKind) {
  const invalidate = useInvalidate(orgId)
  return useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) =>
      orgRegistryApi.deleteRecord(orgId, kind, id, version),
    onSuccess: invalidate,
  })
}

export function useImportOrgEntities(orgId: string, assetTypeId: string) {
  const invalidate = useInvalidate(orgId)
  return useMutation({
    mutationFn: ({
      body,
      format,
      name_field,
      seq_field,
    }: {
      body: string
      format: 'csv' | 'fasta'
      name_field?: string
      seq_field?: string
    }) =>
      orgRegistryApi.importEntities(orgId, assetTypeId, body, {
        format,
        name_field,
        seq_field,
      }),
    onSuccess: invalidate,
  })
}
