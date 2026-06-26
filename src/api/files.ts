import { download, request } from '@/api/client'
import type { Paginated } from '@/api/types'

export type FileCategory =
  | 'raw_data'
  | 'structures'
  | 'sequences'
  | 'reports'
  | 'datasets'
  | 'misc'

// 文件区默认只展示「数据集」一个分类根（精简，与项目的数据集页面对应）。
// 其余分类后端仍支持，但前端默认不展示（如需恢复把它们加回此数组即可）。
export const FILE_CATEGORIES: FileCategory[] = ['datasets']

/** 镜像后端 FileCategory::allowed_extensions（前端先校验，提示更友好）。 */
export const ALLOWED_EXT: Record<FileCategory, string[]> = {
  raw_data: ['csv', 'tsv', 'txt', 'json', 'xml', 'zip', 'gz'],
  structures: ['sdf', 'mol', 'mol2', 'pdb', 'cif'],
  sequences: ['fasta', 'fa', 'fastq', 'fq', 'gb', 'gbk'],
  reports: ['pdf', 'docx', 'xlsx', 'pptx', 'md'],
  datasets: ['csv', 'tsv', 'xlsx', 'parquet', 'json'],
  misc: ['pdf', 'txt', 'csv', 'xlsx', 'docx', 'png', 'jpg', 'jpeg', 'zip', 'json'],
}

export function extOf(name: string): string {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i + 1).toLowerCase() : ''
}

export interface FileItem {
  id: string
  project_id: string
  category: FileCategory
  folder: string
  name: string
  sha256: string
  size: number
  content_type: string
  confidential: boolean
}

export interface FileGrant {
  id: string
  file_id: string
  user_id: string
}

export interface FilesSummary {
  total: number
  by_category: Array<{ category: FileCategory; count: number }>
}

/** 持久文件夹树节点：file_count=直属可见文件数，total_count=含子树。 */
export interface FolderNode {
  name: string
  path: string
  file_count: number
  total_count: number
  children: FolderNode[]
}

export interface FolderCategory {
  category: FileCategory
  file_count: number
  total_count: number
  folders: FolderNode[]
}

export interface FolderTree {
  categories: FolderCategory[]
}

const base = (projectId: string) => `/v1/projects/${projectId}/files`
const foldersBase = (projectId: string) => `/v1/projects/${projectId}/folders`

/** 持久文件夹（空夹也留得住）：树/建/重命名·移动/删（非空需 recursive）。 */
export const foldersApi = {
  list: (projectId: string) => request<FolderTree>(foldersBase(projectId)),
  create: (projectId: string, body: { category: string; path: string }) =>
    request<void>(foldersBase(projectId), {
      method: 'POST',
      body,
      responseType: 'void',
    }),
  rename: (
    projectId: string,
    body: { category: string; from_path: string; to_path: string },
  ) =>
    request<void>(foldersBase(projectId), {
      method: 'PATCH',
      body,
      responseType: 'void',
    }),
  remove: (
    projectId: string,
    params: { category: string; path: string; recursive?: boolean },
  ) =>
    request<void>(foldersBase(projectId), {
      method: 'DELETE',
      query: { ...params },
      responseType: 'void',
    }),
}

export const filesApi = {
  summary: (projectId: string) =>
    request<FilesSummary>(`${base(projectId)}/summary`),
  list: (
    projectId: string,
    params: { category?: string; folder?: string; limit?: number; offset?: number } = {},
  ) => request<Paginated<FileItem>>(base(projectId), { query: { ...params } }),
  upload: (
    projectId: string,
    file: File,
    meta: { category: string; folder?: string; name?: string; confidential?: boolean },
  ) =>
    request<FileItem>(base(projectId), {
      method: 'POST',
      raw: file,
      query: {
        category: meta.category,
        folder: meta.folder,
        name: meta.name ?? file.name,
        content_type: file.type || undefined,
        confidential: meta.confidential ? true : undefined,
      },
      headers: { 'content-type': file.type || 'application/octet-stream' },
    }),
  setConfidential: (projectId: string, fileId: string, confidential: boolean) =>
    request<FileItem>(`${base(projectId)}/${fileId}`, {
      method: 'PATCH',
      body: { confidential },
    }),
  listGrants: (projectId: string, fileId: string) =>
    request<FileGrant[]>(`${base(projectId)}/${fileId}/grants`),
  grant: (projectId: string, fileId: string, userId: string) =>
    request<FileGrant>(`${base(projectId)}/${fileId}/grants`, {
      method: 'POST',
      body: { user_id: userId },
    }),
  revoke: (projectId: string, fileId: string, userId: string) =>
    request<void>(`${base(projectId)}/${fileId}/grants`, {
      method: 'DELETE',
      query: { user_id: userId },
      responseType: 'void',
    }),
  remove: (projectId: string, fileId: string) =>
    request<void>(`${base(projectId)}/${fileId}`, {
      method: 'DELETE',
      responseType: 'void',
    }),
  move: (
    projectId: string,
    fileId: string,
    body: { folder: string; category?: string },
  ) =>
    request<FileItem>(`${base(projectId)}/${fileId}/move`, {
      method: 'POST',
      body,
    }),
  download: (projectId: string, fileId: string, name: string) =>
    download(`${base(projectId)}/${fileId}/content`, name),
  /** 取文件内容为 Blob（带鉴权 + 401 刷新）；供在线预览构造对象 URL。 */
  fetchBlob: (projectId: string, fileId: string) =>
    request<Blob>(`${base(projectId)}/${fileId}/content`, { responseType: 'blob' }),
}
