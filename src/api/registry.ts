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

/** 数据模版（template）禁用引用/结构字段，仅标量。 */
export const SCALAR_FIELD_TYPES: FieldType[] = [
  'string',
  'text',
  'integer',
  'number',
  'boolean',
  'date',
  'datetime',
  'enum',
  'sequence',
]

export interface FieldDef {
  name: string
  type: FieldType
  required: boolean
  unique: boolean
  sensitive: boolean
  options: string[]
}

export type EntityScope = 'organization' | 'project'

/** 类型分两种：药物资产类型(asset) / 数据模版(template)。 */
export type TypeKind = 'asset' | 'template'

export interface EntityType {
  id: string
  scope: EntityScope
  scope_id: string
  kind: TypeKind
  key: string
  name: string
  fields: FieldDef[]
  /** 仅数据模版：绑定到某资产类型（其数据须挂该类型的资产记录）。 */
  bound_asset_type_id?: string | null
  version: number
}

/** 记录：药物资产(asset) 或 药物数据(template)；data 记录可关联一条资产记录。 */
export interface Entity {
  id: string
  project_id: string
  type_id: string
  data: Record<string, unknown>
  /** 仅药物数据：关联的药物资产记录 id。 */
  asset_record_id?: string | null
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

export interface ImportReport {
  created: number
  failed: { row: number; error: string }[]
}

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

/** 建类型 body：资产类型仅 {key,name,fields}；数据模版可带 bound/from。 */
export interface CreateTypeBody {
  key: string
  name: string
  fields: FieldDefInput[]
  bound_asset_type_id?: string
  from_asset_type_id?: string
}

const pbase = (pid: string) => `/v1/projects/${pid}`
/** 类型端点按 kind 分路径。 */
const typePath = (pid: string, kind: TypeKind) =>
  kind === 'asset' ? `${pbase(pid)}/asset-types` : `${pbase(pid)}/data-templates`
/** 记录端点按 kind 分路径。 */
const recPath = (pid: string, kind: TypeKind) =>
  kind === 'asset' ? `${pbase(pid)}/assets` : `${pbase(pid)}/data`

export const registryApi = {
  // ---- 类型 ----
  listAssetTypes: (projectId: string) =>
    request<EntityType[]>(`${pbase(projectId)}/asset-types`),
  listDataTemplates: (projectId: string) =>
    request<EntityType[]>(`${pbase(projectId)}/data-templates`),
  /** 合并两类，供选择器/列表统一展示（每项自带 kind）。 */
  listTypes: async (projectId: string): Promise<EntityType[]> => {
    const [assets, templates] = await Promise.all([
      registryApi.listAssetTypes(projectId),
      registryApi.listDataTemplates(projectId),
    ])
    return [...assets, ...templates]
  },
  getType: (projectId: string, kind: TypeKind, typeId: string) =>
    request<EntityType>(`${typePath(projectId, kind)}/${typeId}`),
  createType: (projectId: string, kind: TypeKind, body: CreateTypeBody) =>
    request<EntityType>(typePath(projectId, kind), { method: 'POST', body }),
  updateType: (
    projectId: string,
    kind: TypeKind,
    typeId: string,
    body: { name?: string; fields?: FieldDefInput[]; version: number },
  ) =>
    request<EntityType>(`${typePath(projectId, kind)}/${typeId}`, {
      method: 'PATCH',
      body,
    }),
  seedDrugRd: (projectId: string) =>
    request<EntityType[]>(`${pbase(projectId)}/registry/seed-drug-rd`, {
      method: 'POST',
    }),
  /** 批量导入仅资产类型支持。 */
  importEntities: (
    projectId: string,
    assetTypeId: string,
    body: string,
    params: { format: 'csv' | 'fasta'; name_field?: string; seq_field?: string },
  ) =>
    request<ImportReport>(
      `${pbase(projectId)}/asset-types/${assetTypeId}/import`,
      {
        method: 'POST',
        raw: body,
        query: { ...params },
        headers: { 'content-type': 'text/plain' },
      },
    ),

  // ---- 字段授权（按 kind 取对应类型路径）----
  listFieldGrants: (projectId: string, kind: TypeKind, typeId: string) =>
    request<FieldGrant[]>(`${typePath(projectId, kind)}/${typeId}/field-grants`),
  grantField: (
    projectId: string,
    kind: TypeKind,
    typeId: string,
    body: { user_id: string; field: string },
  ) =>
    request<FieldGrant>(`${typePath(projectId, kind)}/${typeId}/field-grants`, {
      method: 'POST',
      body,
    }),
  revokeField: (
    projectId: string,
    kind: TypeKind,
    typeId: string,
    userId: string,
    field: string,
  ) =>
    request<void>(`${typePath(projectId, kind)}/${typeId}/field-grants`, {
      method: 'DELETE',
      query: { user_id: userId, field },
      responseType: 'void',
    }),

  // ---- 记录（assets / data，按 kind 分路径）----
  listRecords: (
    projectId: string,
    kind: TypeKind,
    params: { type: string; contains?: string; limit?: number; offset?: number },
  ) =>
    request<Paginated<Entity>>(recPath(projectId, kind), {
      query: { ...params },
    }),
  getRecord: (projectId: string, kind: TypeKind, rid: string) =>
    request<Entity>(`${recPath(projectId, kind)}/${rid}`),
  createRecord: (
    projectId: string,
    kind: TypeKind,
    body: {
      type_id: string
      data: Record<string, unknown>
      asset_record_id?: string
    },
  ) => request<Entity>(recPath(projectId, kind), { method: 'POST', body }),
  updateRecord: (
    projectId: string,
    kind: TypeKind,
    rid: string,
    body: { data: Record<string, unknown>; version: number },
  ) =>
    request<Entity>(`${recPath(projectId, kind)}/${rid}`, {
      method: 'PATCH',
      body,
    }),
  deleteRecord: (
    projectId: string,
    kind: TypeKind,
    rid: string,
    version: number,
  ) =>
    request<void>(`${recPath(projectId, kind)}/${rid}`, {
      method: 'DELETE',
      query: { version },
      responseType: 'void',
    }),

  // ---- 关系 / 图 / 组合树（仅药物资产）----
  listRelations: (
    projectId: string,
    assetId: string,
    params: { direction?: 'out' | 'in'; kind?: string } = {},
  ) =>
    request<Relation[]>(`${pbase(projectId)}/assets/${assetId}/relations`, {
      query: { ...params },
    }),
  addRelation: (
    projectId: string,
    assetId: string,
    body: { to_entity: string; kind: string },
  ) =>
    request<Relation>(`${pbase(projectId)}/assets/${assetId}/relations`, {
      method: 'POST',
      body,
    }),
  deleteRelation: (projectId: string, relationId: string) =>
    request<void>(`${pbase(projectId)}/relations/${relationId}`, {
      method: 'DELETE',
      responseType: 'void',
    }),
  graph: (
    projectId: string,
    assetId: string,
    params: { kind?: string; direction?: 'out' | 'in'; depth?: number } = {},
  ) =>
    request<GraphNode[]>(`${pbase(projectId)}/assets/${assetId}/graph`, {
      query: { ...params },
    }),
  componentTree: (
    projectId: string,
    assetId: string,
    params: { kind?: string; depth?: number } = {},
  ) =>
    request<ComponentNode>(
      `${pbase(projectId)}/assets/${assetId}/component-tree`,
      { query: { ...params } },
    ),
}
