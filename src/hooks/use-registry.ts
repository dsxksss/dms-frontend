import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  registryApi,
  type CreateTypeBody,
  type FieldDefInput,
  type FieldAccessRequest,
  type TypeKind,
} from '@/api/registry'
import { markOnboard } from '@/features/onboarding/flags'

const root = (projectId: string) => ['registry', projectId] as const

export const registryKeys = {
  types: (pid: string) => [...root(pid), 'types'] as const,
  records: (pid: string, params: unknown) =>
    [...root(pid), 'records', params] as const,
  record: (pid: string, rid: string) => [...root(pid), 'record', rid] as const,
  relations: (pid: string, rid: string, params: unknown) =>
    [...root(pid), 'relations', rid, params] as const,
  componentTree: (pid: string, rid: string) =>
    [...root(pid), 'component-tree', rid] as const,
  fieldGrants: (pid: string, tid: string) =>
    [...root(pid), 'field-grants', tid] as const,
  fieldAccess: (pid: string, tid: string) =>
    [...root(pid), 'field-access', tid] as const,
  fieldAccessRequests: (pid: string, tid: string, status?: string) =>
    [...root(pid), 'field-access-requests', tid, status] as const,
  myFieldAccessRequests: (pid: string, tid: string, status?: string) =>
    [...root(pid), 'my-field-access-requests', tid, status] as const,
  myAllFieldAccessRequests: (status?: string) =>
    ['registry', 'me', 'field-access-requests', status] as const,
  incomingFieldAccessRequests: (status?: string) =>
    ['registry', 'me', 'incoming-field-access-requests', status] as const,
}

function useInvalidateRegistry(projectId: string) {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: root(projectId) })
    qc.invalidateQueries({ queryKey: ['registry', 'me'] })
  }
}

// ---- 类型 ----
/** 合并的类型列表（资产类型 + 数据模版，各带 kind）。 */
export function useEntityTypes(projectId: string) {
  return useQuery({
    queryKey: registryKeys.types(projectId),
    queryFn: () => registryApi.listTypes(projectId),
  })
}

export function useCreateType(projectId: string, kind: TypeKind) {
  const invalidate = useInvalidateRegistry(projectId)
  return useMutation({
    mutationFn: (body: CreateTypeBody) =>
      registryApi.createType(projectId, kind, body),
    onSuccess: invalidate,
  })
}

export function useUpdateType(
  projectId: string,
  kind: TypeKind,
  typeId: string,
) {
  const invalidate = useInvalidateRegistry(projectId)
  return useMutation({
    mutationFn: (body: {
      name?: string
      fields?: FieldDefInput[]
      version: number
    }) => registryApi.updateType(projectId, kind, typeId, body),
    onSuccess: invalidate,
  })
}

export function useDeleteType(projectId: string) {
  const invalidate = useInvalidateRegistry(projectId)
  return useMutation({
    mutationFn: ({
      kind,
      typeId,
      version,
    }: {
      kind: TypeKind
      typeId: string
      version: number
    }) => registryApi.deleteType(projectId, kind, typeId, version),
    onSuccess: invalidate,
  })
}

export function useSeedDrugRd(projectId: string) {
  const invalidate = useInvalidateRegistry(projectId)
  return useMutation({
    mutationFn: (keys?: string[]) => registryApi.seedDrugRd(projectId, keys),
    onSuccess: invalidate,
  })
}

export function useDrugRdCatalog(projectId: string, enabled = true) {
  return useQuery({
    queryKey: [...registryKeys.types(projectId), 'catalog'],
    queryFn: () => registryApi.drugRdCatalog(projectId),
    enabled: enabled && !!projectId,
  })
}

export function useImportEntities(projectId: string, assetTypeId: string) {
  const invalidate = useInvalidateRegistry(projectId)
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
      registryApi.importEntities(projectId, assetTypeId, body, {
        format,
        name_field,
        seq_field,
      }),
    onSuccess: invalidate,
  })
}

// ---- 字段授权 ----
export function useFieldGrants(
  projectId: string,
  kind: TypeKind,
  typeId: string,
) {
  return useQuery({
    queryKey: registryKeys.fieldGrants(projectId, typeId),
    queryFn: () => registryApi.listFieldGrants(projectId, kind, typeId),
  })
}

/** 当前用户对某类型敏感字段的列级可见性（表头锁渲染用）。 */
export function useMyFieldAccess(
  projectId: string,
  kind: TypeKind,
  typeId: string,
) {
  return useQuery({
    queryKey: registryKeys.fieldAccess(projectId, typeId),
    queryFn: () => registryApi.myFieldAccess(projectId, kind, typeId),
    enabled: !!typeId,
  })
}

export function useGrantField(
  projectId: string,
  kind: TypeKind,
  typeId: string,
) {
  const invalidate = useInvalidateRegistry(projectId)
  return useMutation({
    mutationFn: (body: { user_id: string; field: string }) =>
      registryApi.grantField(projectId, kind, typeId, body),
    onSuccess: invalidate,
  })
}

export function useRevokeField(
  projectId: string,
  kind: TypeKind,
  typeId: string,
) {
  const invalidate = useInvalidateRegistry(projectId)
  return useMutation({
    mutationFn: ({ userId, field }: { userId: string; field: string }) =>
      registryApi.revokeField(projectId, kind, typeId, userId, field),
    onSuccess: invalidate,
  })
}

export function useRequestFieldAccess(
  projectId: string,
  kind: TypeKind,
  typeId: string,
) {
  const invalidate = useInvalidateRegistry(projectId)
  return useMutation({
    mutationFn: ({ field, message }: { field: string; message?: string }) =>
      registryApi.requestFieldAccess(projectId, kind, typeId, { field, message }),
    onSuccess: invalidate,
  })
}

export function useFieldAccessRequests(
  projectId: string,
  kind: TypeKind,
  typeId: string,
  status?: 'pending' | 'approved' | 'rejected',
) {
  return useQuery({
    queryKey: registryKeys.fieldAccessRequests(projectId, typeId, status),
    queryFn: () => registryApi.listFieldAccessRequests(projectId, kind, typeId, status),
    enabled: !!typeId,
  })
}

export function useMyFieldAccessRequests(
  projectId: string,
  kind: TypeKind,
  typeId: string,
  status?: 'pending' | 'approved' | 'rejected',
) {
  return useQuery({
    queryKey: registryKeys.myFieldAccessRequests(projectId, typeId, status),
    queryFn: () => registryApi.listMyFieldAccessRequests(projectId, kind, typeId, status),
    enabled: !!typeId,
  })
}

export function useApproveFieldAccessRequest(projectId: string) {
  const invalidate = useInvalidateRegistry(projectId)
  return useMutation({
    mutationFn: (requestId: string) =>
      registryApi.approveFieldAccessRequest(projectId, requestId),
    onSuccess: invalidate,
  })
}

export function useRejectFieldAccessRequest(projectId: string) {
  const invalidate = useInvalidateRegistry(projectId)
  return useMutation({
    mutationFn: (requestId: string) =>
      registryApi.rejectFieldAccessRequest(projectId, requestId),
    onSuccess: invalidate,
  })
}

export function useMyAllFieldAccessRequests(
  status?: 'pending' | 'approved' | 'rejected',
) {
  return useQuery({
    queryKey: registryKeys.myAllFieldAccessRequests(status),
    queryFn: () => registryApi.myAllFieldAccessRequests(status),
  })
}

export function useIncomingFieldAccessRequests(
  status: FieldAccessRequest['status'] | 'all' = 'pending',
) {
  const queryStatus = status === 'all' ? undefined : status
  return useQuery({
    queryKey: registryKeys.incomingFieldAccessRequests(status),
    queryFn: () => registryApi.incomingFieldAccessRequests(queryStatus),
  })
}

export function useMarkFieldAccessRequestRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (requestId: string) => registryApi.markFieldAccessRequestRead(requestId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['registry', 'me'] }),
  })
}

export function useMarkAllFieldAccessRequestsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => registryApi.markAllFieldAccessRequestsRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['registry', 'me'] }),
  })
}

// ---- 记录（assets / data）----
export function useRecords(
  projectId: string,
  kind: TypeKind,
  params: { type: string; contains?: string; limit?: number; offset?: number },
  enabled = true,
) {
  return useQuery({
    queryKey: registryKeys.records(projectId, { kind, ...params }),
    queryFn: () => registryApi.listRecords(projectId, kind, params),
    enabled: enabled && !!params.type,
  })
}

export function useRecord(
  projectId: string,
  kind: TypeKind,
  rid: string,
  enabled = true,
) {
  return useQuery({
    queryKey: registryKeys.record(projectId, rid),
    queryFn: () => registryApi.getRecord(projectId, kind, rid),
    enabled: enabled && !!rid,
  })
}

export function useCreateRecord(projectId: string, kind: TypeKind) {
  const invalidate = useInvalidateRegistry(projectId)
  return useMutation({
    mutationFn: (body: {
      type_id: string
      data: Record<string, unknown>
      asset_record_id?: string
    }) => registryApi.createRecord(projectId, kind, body),
    onSuccess: () => {
      invalidate()
      markOnboard('asset') // 快速上手清单：标记「录入数据资产」完成
    },
  })
}

export function useUpdateRecord(
  projectId: string,
  kind: TypeKind,
  rid: string,
) {
  const invalidate = useInvalidateRegistry(projectId)
  return useMutation({
    mutationFn: (body: { data: Record<string, unknown>; version: number }) =>
      registryApi.updateRecord(projectId, kind, rid, body),
    onSuccess: invalidate,
  })
}

export function useDeleteRecord(projectId: string, kind: TypeKind) {
  const invalidate = useInvalidateRegistry(projectId)
  return useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) =>
      registryApi.deleteRecord(projectId, kind, id, version),
    onSuccess: invalidate,
  })
}

// ---- 关系 / 组合树（仅药物资产）----
export function useRelations(
  projectId: string,
  assetId: string,
  params: { direction?: 'out' | 'in'; kind?: string } = {},
) {
  return useQuery({
    queryKey: registryKeys.relations(projectId, assetId, params),
    queryFn: () => registryApi.listRelations(projectId, assetId, params),
    enabled: !!assetId,
  })
}

export function useAddRelation(projectId: string, assetId: string) {
  const invalidate = useInvalidateRegistry(projectId)
  return useMutation({
    mutationFn: (body: { to_entity: string; kind: string }) =>
      registryApi.addRelation(projectId, assetId, body),
    onSuccess: invalidate,
  })
}

export function useDeleteRelation(projectId: string) {
  const invalidate = useInvalidateRegistry(projectId)
  return useMutation({
    mutationFn: (relationId: string) =>
      registryApi.deleteRelation(projectId, relationId),
    onSuccess: invalidate,
  })
}

export function useComponentTree(
  projectId: string,
  assetId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: registryKeys.componentTree(projectId, assetId),
    queryFn: () => registryApi.componentTree(projectId, assetId, { depth: 10 }),
    enabled: enabled && !!assetId,
  })
}

export function useLineage(projectId: string, assetId: string, enabled = true) {
  return useQuery({
    queryKey: [...root(projectId), 'lineage', assetId],
    queryFn: () =>
      registryApi.graph(projectId, assetId, {
        kind: 'derived_from',
        direction: 'out',
        depth: 10,
      }),
    enabled: enabled && !!assetId,
  })
}
