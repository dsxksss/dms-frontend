import { request } from '@/api/client'
import type { Paginated } from '@/api/types'
import type { ProjectRole } from '@/lib/roles'

/** GET /v1/projects → Paginated<Project>（archived 由 archived_at 派生）。 */
export interface Project {
  id: string
  /** 项目统一归属组织（取消个人项目后恒非空；不选时归默认组织「我的组织」）。 */
  organization_id: string
  name: string
  description: string
  archived: boolean
  version: number
}

export interface Member {
  user_id: string
  role: ProjectRole
}

/** 跨组织项目共享（org_id 为 null = 集团共享，对所有组织）。 */
export interface ProjectShare {
  id: string
  project_id: string
  org_id: string | null
  role: ProjectRole
}

/** 项目「申请加入」（组织内可见项目）。 */
export interface ProjectJoinRequest {
  id: string
  project_id: string
  project_name: string
  user_id: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  message: string
  created_at: string
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
  // 注：后端已移除「直接加项目成员」(POST .../members)，新成员一律走邀请/申请。
  // 改**已有**成员角色（Manager）：PATCH .../members/{userId}。
  setMemberRole: (id: string, userId: string, role: ProjectRole) =>
    request<Member>(`/v1/projects/${id}/members/${userId}`, {
      method: 'PATCH',
      body: { role },
    }),
  removeMember: (id: string, userId: string) =>
    request<void>(`/v1/projects/${id}/members/${userId}`, {
      method: 'DELETE',
      responseType: 'void',
    }),

  // ---- cross-org shares ----
  listShares: (id: string) => request<ProjectShare[]>(`/v1/projects/${id}/shares`),
  addShare: (id: string, body: { org_id?: string; role?: ProjectRole }) =>
    request<ProjectShare>(`/v1/projects/${id}/shares`, { method: 'POST', body }),
  removeShare: (id: string, shareId: string) =>
    request<void>(`/v1/projects/${id}/shares/${shareId}`, {
      method: 'DELETE',
      responseType: 'void',
    }),

  // ---- 申请加入（组织内可见项目）----
  requestJoin: (id: string, message = '') =>
    request<ProjectJoinRequest>(`/v1/projects/${id}/join-requests`, {
      method: 'POST',
      body: { message },
    }),
  listJoinRequests: (id: string, status?: string) =>
    request<ProjectJoinRequest[]>(`/v1/projects/${id}/join-requests`, {
      query: status ? { status } : {},
    }),
  myJoinRequests: (status?: string) =>
    request<ProjectJoinRequest[]>('/v1/me/project-join-requests', {
      query: status ? { status } : {},
    }),
  /** 收件箱聚合：我有权审批的待处理申请（跨我管理的所有项目）。 */
  incomingJoinRequests: () =>
    request<ProjectJoinRequest[]>('/v1/me/incoming-project-join-requests'),
  approveJoinRequest: (reqId: string, role: ProjectRole) =>
    request<void>(`/v1/project-join-requests/${reqId}/approve`, {
      method: 'POST',
      body: { role },
      responseType: 'void',
    }),
  rejectJoinRequest: (reqId: string) =>
    request<void>(`/v1/project-join-requests/${reqId}/reject`, {
      method: 'POST',
      responseType: 'void',
    }),
  cancelJoinRequest: (reqId: string) =>
    request<void>(`/v1/project-join-requests/${reqId}`, {
      method: 'DELETE',
      responseType: 'void',
    }),
}
