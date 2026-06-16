import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  registryApi,
  type EntityScope,
  type FieldDefInput,
} from '@/api/registry'

const root = (projectId: string) => ['registry', projectId] as const

export const registryKeys = {
  types: (pid: string) => [...root(pid), 'types'] as const,
  entities: (pid: string, params: unknown) =>
    [...root(pid), 'entities', params] as const,
  entity: (pid: string, eid: string) => [...root(pid), 'entity', eid] as const,
  relations: (pid: string, eid: string, params: unknown) =>
    [...root(pid), 'relations', eid, params] as const,
  componentTree: (pid: string, eid: string) =>
    [...root(pid), 'component-tree', eid] as const,
  fieldGrants: (pid: string, tid: string) =>
    [...root(pid), 'field-grants', tid] as const,
}

function useInvalidateRegistry(projectId: string) {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: root(projectId) })
}

// ---- entity types ----
export function useEntityTypes(projectId: string) {
  return useQuery({
    queryKey: registryKeys.types(projectId),
    queryFn: () => registryApi.listTypes(projectId),
  })
}

export function useCreateType(projectId: string) {
  const invalidate = useInvalidateRegistry(projectId)
  return useMutation({
    mutationFn: ({
      body,
      scope,
    }: {
      body: { key: string; name: string; fields: FieldDefInput[] }
      scope: EntityScope
    }) => registryApi.createType(projectId, body, scope),
    onSuccess: invalidate,
  })
}

export function useUpdateType(projectId: string, typeId: string) {
  const invalidate = useInvalidateRegistry(projectId)
  return useMutation({
    mutationFn: (body: {
      name?: string
      fields?: FieldDefInput[]
      version: number
    }) => registryApi.updateType(projectId, typeId, body),
    onSuccess: invalidate,
  })
}

export function useSeedDrugRd(projectId: string) {
  const invalidate = useInvalidateRegistry(projectId)
  return useMutation({
    mutationFn: () => registryApi.seedDrugRd(projectId),
    onSuccess: invalidate,
  })
}

// ---- field grants ----
export function useFieldGrants(projectId: string, typeId: string) {
  return useQuery({
    queryKey: registryKeys.fieldGrants(projectId, typeId),
    queryFn: () => registryApi.listFieldGrants(projectId, typeId),
  })
}

export function useGrantField(projectId: string, typeId: string) {
  const invalidate = useInvalidateRegistry(projectId)
  return useMutation({
    mutationFn: (body: { user_id: string; field: string }) =>
      registryApi.grantField(projectId, typeId, body),
    onSuccess: invalidate,
  })
}

export function useRevokeField(projectId: string, typeId: string) {
  const invalidate = useInvalidateRegistry(projectId)
  return useMutation({
    mutationFn: ({ userId, field }: { userId: string; field: string }) =>
      registryApi.revokeField(projectId, typeId, userId, field),
    onSuccess: invalidate,
  })
}

// ---- entities ----
export function useEntities(
  projectId: string,
  params: { type: string; contains?: string; limit?: number; offset?: number },
  enabled = true,
) {
  return useQuery({
    queryKey: registryKeys.entities(projectId, params),
    queryFn: () => registryApi.listEntities(projectId, params),
    enabled: enabled && !!params.type,
  })
}

export function useCreateEntity(projectId: string) {
  const invalidate = useInvalidateRegistry(projectId)
  return useMutation({
    mutationFn: (body: { type_id: string; data: Record<string, unknown> }) =>
      registryApi.createEntity(projectId, body),
    onSuccess: invalidate,
  })
}

export function useUpdateEntity(projectId: string, entityId: string) {
  const invalidate = useInvalidateRegistry(projectId)
  return useMutation({
    mutationFn: (body: { data: Record<string, unknown>; version: number }) =>
      registryApi.updateEntity(projectId, entityId, body),
    onSuccess: invalidate,
  })
}

export function useDeleteEntity(projectId: string) {
  const invalidate = useInvalidateRegistry(projectId)
  return useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) =>
      registryApi.deleteEntity(projectId, id, version),
    onSuccess: invalidate,
  })
}

// ---- relations / component tree ----
export function useRelations(
  projectId: string,
  entityId: string,
  params: { direction?: 'out' | 'in'; kind?: string } = {},
) {
  return useQuery({
    queryKey: registryKeys.relations(projectId, entityId, params),
    queryFn: () => registryApi.listRelations(projectId, entityId, params),
    enabled: !!entityId,
  })
}

export function useAddRelation(projectId: string, entityId: string) {
  const invalidate = useInvalidateRegistry(projectId)
  return useMutation({
    mutationFn: (body: { to_entity: string; kind: string }) =>
      registryApi.addRelation(projectId, entityId, body),
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
  entityId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: registryKeys.componentTree(projectId, entityId),
    queryFn: () =>
      registryApi.componentTree(projectId, entityId, { depth: 10 }),
    enabled: enabled && !!entityId,
  })
}
