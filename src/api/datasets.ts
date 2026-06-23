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
  project_id: string
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

const base = (projectId: string) => `/v1/projects/${projectId}/datasets`
const ds = (projectId: string, id: string) => `${base(projectId)}/${id}`

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
  list: (projectId: string, tag?: string) =>
    request<Dataset[]>(base(projectId), { query: tag ? { tag } : {} }),
  listTags: (projectId: string) =>
    request<string[]>(`${base(projectId)}/tags`),
  get: (projectId: string, id: string) => request<Dataset>(ds(projectId, id)),
  create: (projectId: string, body: CreateDatasetInput) =>
    request<Dataset>(base(projectId), { method: 'POST', body }),
  update: (
    projectId: string,
    id: string,
    body: {
      name?: string
      description?: string
      version: number
    } & DatasetMeta,
  ) => request<Dataset>(ds(projectId, id), { method: 'PATCH', body }),
  remove: (projectId: string, id: string, version: number) =>
    request<void>(ds(projectId, id), {
      method: 'DELETE',
      query: { version },
      responseType: 'void',
    }),

  listVersions: (projectId: string, id: string) =>
    request<DatasetVersion[]>(`${ds(projectId, id)}/versions`),
  uploadVersion: (projectId: string, id: string, file: File, format: string) =>
    request<DatasetVersion>(`${ds(projectId, id)}/versions`, {
      method: 'POST',
      raw: file,
      query: { format },
      headers: { 'content-type': file.type || 'application/octet-stream' },
    }),
  setColumnRoles: (
    projectId: string,
    id: string,
    versionNo: number,
    roles: Record<string, string>,
  ) =>
    request<DatasetVersion>(
      `${ds(projectId, id)}/versions/${versionNo}/columns`,
      { method: 'PATCH', body: { roles } },
    ),

  preview: (projectId: string, id: string, params: PreviewParams = {}) =>
    request<QueryPage>(`${ds(projectId, id)}/preview`, { query: { ...params } }),
  exportDownload: (
    projectId: string,
    id: string,
    format: string,
    version?: number,
  ) =>
    download(
      `${ds(projectId, id)}/export`,
      `dataset.${format === 'parquet' ? 'parquet' : 'csv'}`,
      { query: { format, version } },
    ),
}
