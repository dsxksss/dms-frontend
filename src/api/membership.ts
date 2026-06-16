import { request } from '@/api/client'

export interface UserCard {
  id: string
  display_name: string
  email: string
}

export type InvitationKind = 'org' | 'project'

export interface Invitation {
  id: string
  kind: InvitationKind
  target_id: string
  target_name: string
  invitee_user_id: string
  role: string
  status: string
  message: string
  created_at: string
}

export interface SkippedInvite {
  user_id: string
  reason: string
}

export interface BatchInviteResult {
  created: Invitation[]
  skipped: SkippedInvite[]
}

export interface JoinRequest {
  id: string
  organization_id: string
  org_name: string
  user_id: string
  status: string
  message: string
  created_at: string
}

export interface OrgMemberCard {
  user_id: string
  display_name: string
  email: string
  role: string
}

export interface DiscoverableOrg {
  id: string
  slug: string
  name: string
}

export interface InviteBody {
  user_ids: string[]
  role?: string
  message?: string
}

export const membershipApi = {
  // ---- directory ----
  searchUsers: (search: string, limit = 10) =>
    request<UserCard[]>('/v1/users', { query: { search, limit } }),
  getUser: (id: string) => request<UserCard>(`/v1/users/${id}`),

  // ---- invitations (send/list/revoke) ----
  inviteToOrg: (orgId: string, body: InviteBody) =>
    request<BatchInviteResult>(`/v1/orgs/${orgId}/invitations`, {
      method: 'POST',
      body,
    }),
  listOrgInvitations: (orgId: string, status = 'pending') =>
    request<Invitation[]>(`/v1/orgs/${orgId}/invitations`, { query: { status } }),
  inviteToProject: (projectId: string, body: InviteBody) =>
    request<BatchInviteResult>(`/v1/projects/${projectId}/invitations`, {
      method: 'POST',
      body,
    }),
  listProjectInvitations: (projectId: string, status = 'pending') =>
    request<Invitation[]>(`/v1/projects/${projectId}/invitations`, {
      query: { status },
    }),
  revokeInvitation: (id: string) =>
    request<void>(`/v1/invitations/${id}`, {
      method: 'DELETE',
      responseType: 'void',
    }),

  // ---- my invitations (accept/decline) ----
  myInvitations: (status = 'pending') =>
    request<Invitation[]>('/v1/me/invitations', { query: { status } }),
  acceptInvitation: (id: string) =>
    request<void>(`/v1/invitations/${id}/accept`, {
      method: 'POST',
      responseType: 'void',
    }),
  declineInvitation: (id: string) =>
    request<void>(`/v1/invitations/${id}/decline`, {
      method: 'POST',
      responseType: 'void',
    }),

  // ---- org members (list/role/remove) ----
  listOrgMembers: (orgId: string) =>
    request<OrgMemberCard[]>(`/v1/orgs/${orgId}/members`),
  setOrgMemberRole: (orgId: string, userId: string, role: string) =>
    request<void>(`/v1/orgs/${orgId}/members/${userId}`, {
      method: 'PATCH',
      body: { role },
      responseType: 'void',
    }),
  removeOrgMember: (orgId: string, userId: string) =>
    request<void>(`/v1/orgs/${orgId}/members/${userId}`, {
      method: 'DELETE',
      responseType: 'void',
    }),
  updateOrg: (orgId: string, body: { name?: string; discoverable?: boolean }) =>
    request<void>(`/v1/orgs/${orgId}`, {
      method: 'PATCH',
      body,
      responseType: 'void',
    }),

  // ---- join requests ----
  listDiscoverable: (search?: string) =>
    request<DiscoverableOrg[]>('/v1/orgs/discoverable', { query: { search } }),
  requestJoin: (orgId: string, message?: string) =>
    request<JoinRequest>(`/v1/orgs/${orgId}/join-requests`, {
      method: 'POST',
      body: { message },
    }),
  myJoinRequests: (status = 'pending') =>
    request<JoinRequest[]>('/v1/me/join-requests', { query: { status } }),
  cancelJoinRequest: (id: string) =>
    request<void>(`/v1/org-join-requests/${id}`, {
      method: 'DELETE',
      responseType: 'void',
    }),
  listOrgJoinRequests: (orgId: string, status = 'pending') =>
    request<JoinRequest[]>(`/v1/orgs/${orgId}/join-requests`, {
      query: { status },
    }),
  approveJoinRequest: (id: string, role?: string) =>
    request<void>(`/v1/org-join-requests/${id}/approve`, {
      method: 'POST',
      body: { role },
      responseType: 'void',
    }),
  rejectJoinRequest: (id: string) =>
    request<void>(`/v1/org-join-requests/${id}/reject`, {
      method: 'POST',
      responseType: 'void',
    }),
}
