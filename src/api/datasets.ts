import { download, request } from '@/api/client'

export type Visibility = 'private' | 'org' | 'public'
export type ColumnType = 'string' | 'integer' | 'number' | 'boolean'
export type ColumnRole = 'feature' | 'label' | 'id' | 'ignore'

export interface ColumnSchema {
  name: string
  type: ColumnType
  role: ColumnRole
}

/** Dataset 为企业级一等资源（owner + 可见性），不属于 project。 */
export interface Dataset {
  id: string
  owner_id: string
  organization_id: string | null
  name: string
  description: string
  visibility: Visibility
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

export interface DatasetLink {
  id: string
  dataset_id: string
  entity_id: string
  kind: string
}

export interface CreateDatasetInput {
  name: string
  description?: string
  visibility?: Visibility
  organization_id?: string
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

const ds = (id: string) => `/v1/datasets/${id}`

export const datasetsApi = {
  list: () => request<Dataset[]>('/v1/datasets'),
  get: (id: string) => request<Dataset>(ds(id)),
  create: (body: CreateDatasetInput) =>
    request<Dataset>('/v1/datasets', { method: 'POST', body }),
  update: (
    id: string,
    body: {
      name?: string
      description?: string
      visibility?: Visibility
      version: number
    },
  ) => request<Dataset>(ds(id), { method: 'PATCH', body }),
  remove: (id: string, version: number) =>
    request<void>(ds(id), {
      method: 'DELETE',
      query: { version },
      responseType: 'void',
    }),

  listVersions: (id: string) =>
    request<DatasetVersion[]>(`${ds(id)}/versions`),
  uploadVersion: (id: string, file: File, format: string) =>
    request<DatasetVersion>(`${ds(id)}/versions`, {
      method: 'POST',
      raw: file,
      query: { format },
      headers: { 'content-type': file.type || 'application/octet-stream' },
    }),
  setColumnRoles: (
    id: string,
    versionNo: number,
    roles: Record<string, string>,
  ) =>
    request<DatasetVersion>(`${ds(id)}/versions/${versionNo}/columns`, {
      method: 'PATCH',
      body: { roles },
    }),

  preview: (id: string, params: PreviewParams = {}) =>
    request<QueryPage>(`${ds(id)}/preview`, { query: { ...params } }),
  exportDownload: (id: string, format: string, version?: number) =>
    download(`${ds(id)}/export`, `dataset.${format === 'parquet' ? 'parquet' : 'csv'}`, {
      query: { format, version },
    }),

  listLinks: (id: string) => request<DatasetLink[]>(`${ds(id)}/links`),
  addLink: (id: string, body: { entity_id: string; kind: string }) =>
    request<DatasetLink>(`${ds(id)}/links`, { method: 'POST', body }),
  deleteLink: (id: string, linkId: string) =>
    request<void>(`${ds(id)}/links/${linkId}`, {
      method: 'DELETE',
      responseType: 'void',
    }),

  /** 反查：引用某实体的数据集（实体在项目内，故走项目作用域路径）。 */
  forEntity: (projectId: string, entityId: string) =>
    request<Dataset[]>(`/v1/projects/${projectId}/entities/${entityId}/datasets`),
}
