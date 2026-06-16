import { request } from '@/api/client'
import type { Paginated } from '@/api/types'
import type { ProjectRole } from '@/lib/roles'

/** GET /v1/projects → Paginated<Project>（archived 由 archived_at 派生）。 */
export interface Project {
  id: string
  organization_id: string | null
  name: string
  description: string
  archived: boolean
  version: number
}

export interface Member {
  user_id: string
  role: ProjectRole
}

export interface CreateProjectInput {
  name: string
  description?: string
  organization_id?: string
}

export interface UpdateProjectInput {
  name?: string
  description?: string
  organization_id?: string
  version: number
}

export interface ListProjectsParams {
  organization_id?: string
  include_archived?: boolean
  limit?: number
  offset?: number
}

export const projectsApi = {
  list: (p: ListProjectsParams = {}) =>
    request<Paginated<Project>>('/v1/projects', { query: { ...p } }),
  get: (id: string) => request<Project>(`/v1/projects/${id}`),
  create: (body: CreateProjectInput) =>
    request<Project>('/v1/projects', { method: 'POST', body }),
  update: (id: string, body: UpdateProjectInput) =>
    request<Project>(`/v1/projects/${id}`, { method: 'PATCH', body }),
  remove: (id: string, version: number) =>
    request<void>(`/v1/projects/${id}`, {
      method: 'DELETE',
      query: { version },
      responseType: 'void',
    }),
  archive: (id: string) =>
    request<Project>(`/v1/projects/${id}/archive`, { method: 'POST' }),
  unarchive: (id: string) =>
    request<Project>(`/v1/projects/${id}/unarchive`, { method: 'POST' }),
  members: (id: string) => request<Member[]>(`/v1/projects/${id}/members`),
  addMember: (id: string, body: Member) =>
    request<Member>(`/v1/projects/${id}/members`, { method: 'POST', body }),
  removeMember: (id: string, userId: string) =>
    request<void>(`/v1/projects/${id}/members/${userId}`, {
      method: 'DELETE',
      responseType: 'void',
    }),
}
