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
  /** 仅 reference 字段：引用目标的资产类型 key（前端据此过滤候选；软引用，后端不强制类型）。 */
  ref_type?: string | null
  /** 数值/整数字段可关联单位库；记录值本身仍为纯数字。 */
  unit_id?: string | null
  /** 单位符号快照，例如 mM、μM、ng/mL。 */
  unit_symbol?: string | null
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
  name_zh?: string | null
  name_en?: string | null
  description?: string | null
  fields: FieldDef[]
  /** 仅数据模版：绑定到某资产类型（其数据须挂该类型的资产记录）。 */
  bound_asset_type_id?: string | null
  version: number
}

/** 记录：药物资产(asset) 或 药物数据(template)；data 记录可关联一条资产记录。 */
export interface Entity {
  id: string
  /** 项目级记录为项目 id；组织级记录(scope=organization)为 null。 */
  project_id: string | null
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

export interface FieldAccessRequest {
  id: string
  project_id: string
  project_name: string
  type_id: string
  type_name: string
  user_id: string
  field: string
  message: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  decided_at?: string | null
  decided_by?: string | null
  requester_read_at?: string | null
}

/** 当前用户对某类型敏感字段的列级可见性（前端表头锁渲染，不必靠「值为空」猜）。 */
export interface FieldAccess {
  type_id: string
  /** 该类型的全部敏感字段。 */
  sensitive_fields: string[]
  /** 当前用户可见明文的字段。 */
  visible_fields: string[]
  /** 当前用户被隐藏（整列锁定）的字段。 */
  locked_fields: string[]
  /** 当前用户对该类型记录的有效增/改/删能力（角色 ≥ 贡献者 或被细粒度授权）。前端据此显示按钮。 */
  can_create: boolean
  can_update: boolean
  can_delete: boolean
}

export interface ImportReport {
  created: number
  failed: { row: number; error: string }[]
}

/** 系统内置类型目录项（供选择性导入，不含真实类型 id）。 */
export interface DrugRdCatalogType {
  key: string
  name: string
  kind: TypeKind
  field_count: number
  sensitive_count: number
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
  /** 仅 reference 字段：引用目标的资产类型 key。 */
  ref_type?: string
  /** 仅 number/integer 字段：关联单位库。 */
  unit_id?: string | null
  unit_symbol?: string | null
}

/** 建类型 body：资产类型仅 {key,name,fields}；数据模版可带 bound/from。 */
export interface CreateTypeBody {
  key: string
  name: string
  name_zh?: string | null
  name_en?: string | null
  description?: string | null
  fields: FieldDefInput[]
  bound_asset_type_id?: string
  from_asset_type_id?: string
}

export function entityTypeDisplayName(type: EntityType, language = ''): string {
  const preferred =
    language.toLowerCase().startsWith('zh')
      ? type.name_zh || type.name || type.name_en
      : type.name_en || type.name || type.name_zh
  return preferred || type.key
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
  listAssetTypes: (projectId: string, deleted = false) =>
    request<EntityType[]>(`${pbase(projectId)}/asset-types`, {
      query: deleted ? { deleted: true } : undefined,
    }),
  listDataTemplates: (projectId: string, deleted = false) =>
    request<EntityType[]>(`${pbase(projectId)}/data-templates`, {
      query: deleted ? { deleted: true } : undefined,
    }),
  /** 合并两类，供选择器/列表统一展示（每项自带 kind）。 */
  listTypes: async (projectId: string): Promise<EntityType[]> => {
    const [assets, templates] = await Promise.all([
      registryApi.listAssetTypes(projectId),
      registryApi.listDataTemplates(projectId),
    ])
    return [...assets, ...templates]
  },
  listDeletedTypes: async (projectId: string): Promise<EntityType[]> => {
    const [assets, templates] = await Promise.all([
      registryApi.listAssetTypes(projectId, true),
      registryApi.listDataTemplates(projectId, true),
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
    body: {
      name?: string
      name_zh?: string | null
      name_en?: string | null
      description?: string | null
      fields?: FieldDefInput[]
      version: number
    },
  ) =>
    request<EntityType>(`${typePath(projectId, kind)}/${typeId}`, {
      method: 'PATCH',
      body,
    }),
  /** 删除类型（乐观锁 version）。有记录 / 被模板绑定 → 409。 */
  deleteType: (projectId: string, kind: TypeKind, typeId: string, version: number) =>
    request<void>(`${typePath(projectId, kind)}/${typeId}`, {
      method: 'DELETE',
      query: { version },
      responseType: 'void',
    }),
  restoreType: (
    projectId: string,
    kind: TypeKind,
    typeId: string,
    version: number,
  ) =>
    request<EntityType>(`${typePath(projectId, kind)}/${typeId}/restore`, {
      method: 'POST',
      query: { version },
    }),
  purgeType: (projectId: string, kind: TypeKind, typeId: string, version: number) =>
    request<void>(`${typePath(projectId, kind)}/${typeId}/purge`, {
      method: 'DELETE',
      query: { version },
      responseType: 'void',
    }),
  /** seed 内置类型；keys 给定时仅导入这些（选择性导入），缺省 = 全部。幂等。 */
  seedDrugRd: (projectId: string, keys?: string[]) =>
    request<EntityType[]>(`${pbase(projectId)}/registry/seed-drug-rd`, {
      method: 'POST',
      body: keys && keys.length ? { keys } : {},
    }),
  /** 系统内置类型目录元信息（供选择性导入 UI）。 */
  drugRdCatalog: (projectId: string) =>
    request<DrugRdCatalogType[]>(`${pbase(projectId)}/registry/drug-rd-catalog`),
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
        // 后端 import 仅声明 text/csv / application/octet-stream（FASTA 亦为文本）。
        headers: { 'content-type': 'text/csv' },
      },
    ),

  // ---- 字段授权（按 kind 取对应类型路径）----
  listFieldGrants: (projectId: string, kind: TypeKind, typeId: string) =>
    request<FieldGrant[]>(`${typePath(projectId, kind)}/${typeId}/field-grants`),
  /** 当前用户对该类型敏感字段的列级可见性。 */
  myFieldAccess: (projectId: string, kind: TypeKind, typeId: string) =>
    request<FieldAccess>(
      `${typePath(projectId, kind)}/${typeId}/my-field-access`,
    ),
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
  requestFieldAccess: (
    projectId: string,
    kind: TypeKind,
    typeId: string,
    body: { field: string; message?: string },
  ) =>
    request<FieldAccessRequest>(
      `${typePath(projectId, kind)}/${typeId}/field-access-requests`,
      { method: 'POST', body },
    ),
  listFieldAccessRequests: (
    projectId: string,
    kind: TypeKind,
    typeId: string,
    status?: FieldAccessRequest['status'],
  ) =>
    request<FieldAccessRequest[]>(
      `${typePath(projectId, kind)}/${typeId}/field-access-requests`,
      { query: { status } },
    ),
  listMyFieldAccessRequests: (
    projectId: string,
    kind: TypeKind,
    typeId: string,
    status?: FieldAccessRequest['status'],
  ) =>
    request<FieldAccessRequest[]>(
      `${typePath(projectId, kind)}/${typeId}/my-field-access-requests`,
      { query: { status } },
    ),
  approveFieldAccessRequest: (projectId: string, requestId: string) =>
    request<FieldAccessRequest>(
      `${pbase(projectId)}/field-access-requests/${requestId}/approve`,
      { method: 'POST' },
    ),
  rejectFieldAccessRequest: (projectId: string, requestId: string) =>
    request<FieldAccessRequest>(
      `${pbase(projectId)}/field-access-requests/${requestId}/reject`,
      { method: 'POST' },
    ),
  myAllFieldAccessRequests: (status?: FieldAccessRequest['status']) =>
    request<FieldAccessRequest[]>('/v1/me/field-access-requests', {
      query: { status },
    }),
  incomingFieldAccessRequests: (status?: FieldAccessRequest['status']) =>
    request<FieldAccessRequest[]>('/v1/me/incoming-field-access-requests', {
      query: { status },
    }),
  markFieldAccessRequestRead: (requestId: string) =>
    request<FieldAccessRequest>(`/v1/me/field-access-requests/${requestId}/read`, {
      method: 'POST',
    }),
  markAllFieldAccessRequestsRead: () =>
    request<void>('/v1/me/field-access-requests/read-all', {
      method: 'POST',
      responseType: 'void',
    }),

  // ---- 记录（assets / data，按 kind 分路径）----
  listRecords: (
    projectId: string,
    kind: TypeKind,
    params: {
      type: string
      contains?: string
      deleted?: boolean
      limit?: number
      offset?: number
    },
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
  restoreRecord: (
    projectId: string,
    kind: TypeKind,
    rid: string,
    version: number,
  ) =>
    request<Entity>(`${recPath(projectId, kind)}/${rid}/restore`, {
      method: 'POST',
      query: { version },
    }),
  purgeRecord: (
    projectId: string,
    kind: TypeKind,
    rid: string,
    version: number,
  ) =>
    request<void>(`${recPath(projectId, kind)}/${rid}/purge`, {
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
