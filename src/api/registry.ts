import { request } from '@/api/client'
import type { Paginated } from '@/api/types'

export type FieldType =
  | 'string'
  | 'text'
  | 'integer'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'enum'
  | 'sequence'
  | 'structure'
  | 'reference'

/** entity_types.fields JSONB 元素。`type` 为 serde rename。 */
export interface FieldDef {
  name: string
  type: FieldType
  required: boolean
  unique: boolean
  sensitive: boolean
  options: string[]
}

export type EntityScope = 'organization' | 'project'

export interface EntityType {
  id: string
  scope: EntityScope
  scope_id: string
  key: string
  name: string
  fields: FieldDef[]
  version: number
}

export interface Entity {
  id: string
  project_id: string
  type_id: string
  /** 动态字段值；敏感字段对无权用户会缺省（被后端隐藏）。 */
  data: Record<string, unknown>
  version: number
}

export interface Relation {
  id: string
  from_entity: string
  to_entity: string
  kind: string
}

export interface GraphNode {
  id: string
  type_id: string
}

export interface ComponentNode {
  id: string
  type_id: string
  children: ComponentNode[]
}

export interface FieldGrant {
  id: string
  type_id: string
  user_id: string
  field: string
}

/** 关系类型常量（与后端对齐）。 */
export const RELATION_KINDS = {
  derivedFrom: 'derived_from',
  hasComponent: 'has_component',
} as const

export interface FieldDefInput {
  name: string
  type: FieldType
  required: boolean
  unique: boolean
  sensitive: boolean
  options: string[]
}

const base = (projectId: string) => `/v1/projects/${projectId}`

export const registryApi = {
  // ---- entity types ----
  listTypes: (projectId: string) =>
    request<EntityType[]>(`${base(projectId)}/entity-types`),
  getType: (projectId: string, typeId: string) =>
    request<EntityType>(`${base(projectId)}/entity-types/${typeId}`),
  createType: (
    projectId: string,
    body: { key: string; name: string; fields: FieldDefInput[] },
    scope: EntityScope = 'project',
  ) =>
    request<EntityType>(`${base(projectId)}/entity-types`, {
      method: 'POST',
      body,
      query: { scope: scope === 'organization' ? 'org' : 'project' },
    }),
  updateType: (
    projectId: string,
    typeId: string,
    body: { name?: string; fields?: FieldDefInput[]; version: number },
  ) =>
    request<EntityType>(`${base(projectId)}/entity-types/${typeId}`, {
      method: 'PATCH',
      body,
    }),
  seedDrugRd: (projectId: string) =>
    request<EntityType[]>(`${base(projectId)}/registry/seed-drug-rd`, {
      method: 'POST',
    }),

  // ---- field grants ----
  listFieldGrants: (projectId: string, typeId: string) =>
    request<FieldGrant[]>(
      `${base(projectId)}/entity-types/${typeId}/field-grants`,
    ),
  grantField: (
    projectId: string,
    typeId: string,
    body: { user_id: string; field: string },
  ) =>
    request<FieldGrant>(
      `${base(projectId)}/entity-types/${typeId}/field-grants`,
      { method: 'POST', body },
    ),
  revokeField: (
    projectId: string,
    typeId: string,
    userId: string,
    field: string,
  ) =>
    request<void>(`${base(projectId)}/entity-types/${typeId}/field-grants`, {
      method: 'DELETE',
      query: { user_id: userId, field },
      responseType: 'void',
    }),

  // ---- entities ----
  listEntities: (
    projectId: string,
    params: { type: string; contains?: string; limit?: number; offset?: number },
  ) =>
    request<Paginated<Entity>>(`${base(projectId)}/entities`, {
      query: { ...params },
    }),
  getEntity: (projectId: string, entityId: string) =>
    request<Entity>(`${base(projectId)}/entities/${entityId}`),
  createEntity: (
    projectId: string,
    body: { type_id: string; data: Record<string, unknown> },
  ) =>
    request<Entity>(`${base(projectId)}/entities`, { method: 'POST', body }),
  updateEntity: (
    projectId: string,
    entityId: string,
    body: { data: Record<string, unknown>; version: number },
  ) =>
    request<Entity>(`${base(projectId)}/entities/${entityId}`, {
      method: 'PATCH',
      body,
    }),
  deleteEntity: (projectId: string, entityId: string, version: number) =>
    request<void>(`${base(projectId)}/entities/${entityId}`, {
      method: 'DELETE',
      query: { version },
      responseType: 'void',
    }),

  // ---- relations / graph ----
  listRelations: (
    projectId: string,
    entityId: string,
    params: { direction?: 'out' | 'in'; kind?: string } = {},
  ) =>
    request<Relation[]>(`${base(projectId)}/entities/${entityId}/relations`, {
      query: { ...params },
    }),
  addRelation: (
    projectId: string,
    entityId: string,
    body: { to_entity: string; kind: string },
  ) =>
    request<Relation>(`${base(projectId)}/entities/${entityId}/relations`, {
      method: 'POST',
      body,
    }),
  deleteRelation: (projectId: string, relationId: string) =>
    request<void>(`${base(projectId)}/relations/${relationId}`, {
      method: 'DELETE',
      responseType: 'void',
    }),
  graph: (
    projectId: string,
    entityId: string,
    params: { kind?: string; direction?: 'out' | 'in'; depth?: number } = {},
  ) =>
    request<GraphNode[]>(`${base(projectId)}/entities/${entityId}/graph`, {
      query: { ...params },
    }),
  componentTree: (
    projectId: string,
    entityId: string,
    params: { kind?: string; depth?: number } = {},
  ) =>
    request<ComponentNode>(
      `${base(projectId)}/entities/${entityId}/component-tree`,
      { query: { ...params } },
    ),
}
