import { request } from '@/api/client'
import type { Paginated } from '@/api/types'

/** 实验记录条目（ELN Markdown 文档）。 */
export interface NotebookEntry {
  id: string
  project_id: string
  title: string
  content: string
  archived: boolean
  version: number
}

const base = (projectId: string) => `/v1/projects/${projectId}/notebook-entries`

export const notebookApi = {
  list: (
    projectId: string,
    params: { include_archived?: boolean; limit?: number; offset?: number } = {},
  ) =>
    request<Paginated<NotebookEntry>>(base(projectId), { query: { ...params } }),
  get: (projectId: string, id: string) =>
    request<NotebookEntry>(`${base(projectId)}/${id}`),
  create: (projectId: string, body: { title: string; content?: string }) =>
    request<NotebookEntry>(base(projectId), { method: 'POST', body }),
  update: (
    projectId: string,
    id: string,
    body: { title?: string; content?: string; version: number },
  ) =>
    request<NotebookEntry>(`${base(projectId)}/${id}`, { method: 'PATCH', body }),
  remove: (projectId: string, id: string, version: number) =>
    request<void>(`${base(projectId)}/${id}`, {
      method: 'DELETE',
      query: { version },
      responseType: 'void',
    }),
  setArchived: (projectId: string, id: string, archived: boolean) =>
    request<NotebookEntry>(
      `${base(projectId)}/${id}/${archived ? 'archive' : 'unarchive'}`,
      { method: 'POST' },
    ),
}
