import { request } from '@/api/client'
import type { Paginated } from '@/api/types'
import type {
  CreateTypeBody,
  Entity,
  EntityType,
  FieldDefInput,
  ImportReport,
  TypeKind,
} from '@/api/registry'

/**
 * 组织级药物资产/数据（场景 2.4）：组织既共享类型，也承载组织级记录。
 * 鉴权：读=组织成员；建 Schema / 写记录=组织 admin。
 * 敏感字段：org admin 全可见；org member 隐藏（组织级暂无 field-grant）。
 * 组织级记录 scope="organization"、project_id=null。
 */
const obase = (orgId: string) => `/v1/orgs/${orgId}`
const typePath = (orgId: string, kind: TypeKind) =>
  kind === 'asset'
    ? `${obase(orgId)}/asset-types`
    : `${obase(orgId)}/data-templates`
const recPath = (orgId: string, kind: TypeKind) =>
  kind === 'asset' ? `${obase(orgId)}/assets` : `${obase(orgId)}/data`

export const orgRegistryApi = {
  // ---- 类型 ----
  listAssetTypes: (orgId: string) =>
    request<EntityType[]>(`${obase(orgId)}/asset-types`),
  listDataTemplates: (orgId: string) =>
    request<EntityType[]>(`${obase(orgId)}/data-templates`),
  listTypes: async (orgId: string): Promise<EntityType[]> => {
    const [assets, templates] = await Promise.all([
      orgRegistryApi.listAssetTypes(orgId),
      orgRegistryApi.listDataTemplates(orgId),
    ])
    return [...assets, ...templates]
  },
  createType: (orgId: string, kind: TypeKind, body: CreateTypeBody) =>
    request<EntityType>(typePath(orgId, kind), { method: 'POST', body }),

  // ---- 记录 ----
  listRecords: (
    orgId: string,
    kind: TypeKind,
    params: {
      type?: string
      contains?: string
      search?: string
      search_field?: string
      sort?: string
      desc?: boolean
      limit?: number
      offset?: number
    },
  ) =>
    request<Paginated<Entity>>(recPath(orgId, kind), { query: { ...params } }),
  getRecord: (orgId: string, kind: TypeKind, rid: string) =>
    request<Entity>(`${recPath(orgId, kind)}/${rid}`),
  createRecord: (
    orgId: string,
    kind: TypeKind,
    body: { type_id: string; data: Record<string, unknown> },
  ) => request<Entity>(recPath(orgId, kind), { method: 'POST', body }),
  updateRecord: (
    orgId: string,
    kind: TypeKind,
    rid: string,
    body: { data: Record<string, unknown>; version: number },
  ) =>
    request<Entity>(`${recPath(orgId, kind)}/${rid}`, {
      method: 'PATCH',
      body,
    }),
  deleteRecord: (orgId: string, kind: TypeKind, rid: string, version: number) =>
    request<void>(`${recPath(orgId, kind)}/${rid}`, {
      method: 'DELETE',
      query: { version },
      responseType: 'void',
    }),

  // ---- 批量导入（仅资产类型）----
  importEntities: (
    orgId: string,
    assetTypeId: string,
    body: string,
    params: {
      format: 'csv' | 'fasta'
      name_field?: string
      seq_field?: string
    },
  ) =>
    request<ImportReport>(`${obase(orgId)}/asset-types/${assetTypeId}/import`, {
      method: 'POST',
      raw: body,
      query: { ...params },
      // 后端 import 仅声明 text/csv / application/octet-stream（FASTA 亦为文本）。
      headers: { 'content-type': 'text/csv' },
    }),
}

export type { CreateTypeBody, FieldDefInput }
