import { download, request } from '@/api/client'

export type ColumnType = 'string' | 'integer' | 'number' | 'boolean'
export type ColumnRole = 'feature' | 'label' | 'id' | 'ignore'

export interface ColumnSchema {
  name: string
  type: ColumnType
  role: ColumnRole
}

/** Dataset 挂在项目下；可见/可写由项目成员角色决定（无 owner/visibility）。 */
export interface Dataset {
  id: string
  project_id?: string | null
  scope: 'project' | 'organization'
  scope_id: string
  name: string
  description: string
  tags: string[]
  author: string
  references: string[]
  version: number
}

export interface DatasetVersion {
  id: string
  dataset_id: string
  version_no: number
  format: string
  blob_sha256: string
  byte_size: number
  row_count: number
  columns: ColumnSchema[]
}

export interface QueryPage {
  columns: string[]
  rows: string[][]
  total: number
  limit: number
  offset: number
}

export interface CreateDatasetInput {
  name: string
  description?: string
  tags?: string[]
  author?: string
  references?: string[]
}

/** 建/改数据集可带的元数据（后端规范化：trim、去空、大小写不敏感去重，各 ≤50 项）。 */
export interface DatasetMeta {
  tags?: string[]
  author?: string
  references?: string[]
}

export interface PreviewParams {
  version?: number
  limit?: number
  offset?: number
  search?: string
  filter_col?: string
  filter_val?: string
  sort?: string
  desc?: boolean
}

export type DatasetScope =
  | string
  | {
      type: 'project' | 'organization'
      id: string
    }

export const projectDatasetScope = (projectId: string): DatasetScope => projectId
export const orgDatasetScope = (orgId: string): DatasetScope => ({
  type: 'organization',
  id: orgId,
})

const normalizeScope = (scope: DatasetScope): Exclude<DatasetScope, string> =>
  typeof scope === 'string' ? { type: 'project', id: scope } : scope

/** 数据转数据集（从某资产类型/数据模版的项目记录生成数据集 + 溯源）。 */
export interface FromRegistryInput {
  name: string
  type_id: string
  /** 选导出的字段（空=全部）。 */
  fields?: string[]
  /** 默认 true 剔除敏感字段；false=导出原始敏感字段(需 Manager + approved 电子签名)。 */
  mask_sensitive?: boolean
  /** 引用列导出形态：name(默认,记录名) / content(主内容字段,如序列/SMILES,敏感受脱敏约束) / id(业务编号) / raw(原始 uuid)。 */
  reference_mode?: 'name' | 'content' | 'id' | 'raw'
  description?: string
  tags?: string[]
  author?: string
  references?: string[]
}

/** 数据集溯源条目：来源类型(entity_type) / 源记录(entity)。 */
export interface LineageNode {
  source_kind: 'entity_type' | 'entity'
  source_id: string
  kind: string
}

/** 系统级公共数据集（全企业只读，平台超管维护）。 */
export interface SystemDataset {
  id: string
  name: string
  description: string
  tags: string[]
  author: string
  references: string[]
  version: number
}

const base = (scope: DatasetScope) => {
  const s = normalizeScope(scope)
  return s.type === 'organization'
    ? `/v1/orgs/${s.id}/datasets`
    : `/v1/projects/${s.id}/datasets`
}
const ds = (scope: DatasetScope, id: string) => `${base(scope)}/${id}`

const sysBase = '/v1/datasets/system'
const sys = (id: string) => `${sysBase}/${id}`

/** 公共数据集只读访问（任意已认证用户）。 */
export const systemDatasetsApi = {
  list: (tag?: string) =>
    request<SystemDataset[]>(sysBase, { query: tag ? { tag } : {} }),
  listTags: () => request<string[]>(`${sysBase}/tags`),
  get: (id: string) => request<SystemDataset>(sys(id)),
  listVersions: (id: string) => request<DatasetVersion[]>(`${sys(id)}/versions`),
  preview: (id: string, params: PreviewParams = {}) =>
    request<QueryPage>(`${sys(id)}/preview`, { query: { ...params } }),
  exportDownload: (id: string, format: string) =>
    download(
      `${sys(id)}/export`,
      `dataset.${format === 'parquet' ? 'parquet' : 'csv'}`,
      { query: { format } },
    ),
}

export const datasetsApi = {
  list: (scope: DatasetScope, tag?: string) =>
    request<Dataset[]>(base(scope), { query: tag ? { tag } : {} }),
  listTags: (scope: DatasetScope) =>
    request<string[]>(`${base(scope)}/tags`),
  get: (scope: DatasetScope, id: string) => request<Dataset>(ds(scope, id)),
  create: (scope: DatasetScope, body: CreateDatasetInput) =>
    request<Dataset>(base(scope), { method: 'POST', body }),
  update: (
    scope: DatasetScope,
    id: string,
    body: {
      name?: string
      description?: string
      version: number
    } & DatasetMeta,
  ) => request<Dataset>(ds(scope, id), { method: 'PATCH', body }),
  remove: (scope: DatasetScope, id: string, version: number) =>
    request<void>(ds(scope, id), {
      method: 'DELETE',
      query: { version },
      responseType: 'void',
    }),

  /** 数据转数据集：从资产类型/数据模版记录生成数据集 + derived_from 溯源。 */
  fromRegistry: (projectId: string, body: FromRegistryInput) =>
    request<Dataset>(`${base(projectId)}/from-registry`, {
      method: 'POST',
      body,
    }),
  /** 数据集溯源（derived_from 源类型 + 源记录）。 */
  lineage: (projectId: string, id: string) =>
    request<LineageNode[]>(`${ds(projectId, id)}/lineage`),

  listVersions: (scope: DatasetScope, id: string) =>
    request<DatasetVersion[]>(`${ds(scope, id)}/versions`),
  uploadVersion: (scope: DatasetScope, id: string, file: File, format: string) =>
    request<DatasetVersion>(`${ds(scope, id)}/versions`, {
      method: 'POST',
      raw: file,
      query: { format },
      headers: { 'content-type': file.type || 'application/octet-stream' },
    }),
  setColumnRoles: (
    scope: DatasetScope,
    id: string,
    versionNo: number,
    roles: Record<string, string>,
  ) =>
    request<DatasetVersion>(
      `${ds(scope, id)}/versions/${versionNo}/columns`,
      { method: 'PATCH', body: { roles } },
    ),

  preview: (scope: DatasetScope, id: string, params: PreviewParams = {}) =>
    request<QueryPage>(`${ds(scope, id)}/preview`, { query: { ...params } }),
  exportDownload: (
    scope: DatasetScope,
    id: string,
    format: string,
    version?: number,
  ) =>
    download(
      `${ds(scope, id)}/export`,
      `dataset.${format === 'parquet' ? 'parquet' : 'csv'}`,
      { query: { format, version } },
    ),
}
