import { request } from '@/api/client'

export interface Organization {
  id: string
  slug: string
  name: string
  /** 是否可被搜索/申请加入；后端在 OrganizationResponse 返回后即可回显当前状态。 */
  discoverable?: boolean
  /** 注册自动创建的默认组织「我的组织」；前端据此置顶/打标，无行为特权。列表已按其置顶。 */
  is_default?: boolean
  /** 创建者用户 id。只有创建者可删除组织。 */
  created_by?: string | null
}

export interface Team {
  id: string
  organization_id: string
  slug: string
  name: string
}

export interface GrantRequest {
  principal_type: string
  principal_id: string
  role_key: string
  scope_type: string
  scope_id?: string
  resource_type?: string
}

export const orgsApi = {
  listOrgs: () => request<Organization[]>('/v1/orgs'),
  createOrg: (body: { slug: string; name: string }) =>
    request<Organization>('/v1/orgs', { method: 'POST', body }),
  deleteOrg: (orgId: string) =>
    request<void>(`/v1/orgs/${orgId}`, { method: 'DELETE', responseType: 'void' }),
  listTeams: (orgId: string) => request<Team[]>(`/v1/orgs/${orgId}/teams`),
  createTeam: (body: { organization_id: string; slug: string; name: string }) =>
    request<Team>('/v1/teams', { method: 'POST', body }),
  addTeamMember: (teamId: string, body: { user_id: string; role?: string }) =>
    request<void>(`/v1/teams/${teamId}/members`, {
      method: 'POST',
      body,
      responseType: 'void',
    }),
  grantRole: (body: GrantRequest) =>
    request<void>('/v1/role-grants', { method: 'POST', body, responseType: 'void' }),
  revokeRole: (body: GrantRequest) =>
    request<void>('/v1/role-grants', {
      method: 'DELETE',
      body,
      responseType: 'void',
    }),
  myPermissions: (params: {
    organization?: string
    resource_type?: string
    resource_id?: string
  }) =>
    request<{ permissions: string[] }>('/v1/me/permissions', { query: { ...params } }),
}
