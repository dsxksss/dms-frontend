import { platformRequest } from '@/platform/client'
import type { Paginated, PageQuery, SessionTokens } from '@/api/types'

/** GET /v1/platform/me */
export interface PlatformMe {
  platform_admin: boolean
  id: string
  email: string
  display_name?: string
}

/** GET /v1/platform/stats */
export interface PlatformStats {
  tenants: number
  active_tenants: number
  suspended_tenants: number
  total_orgs: number
  total_users: number
  total_storage: number
}

/** GET /v1/platform/license */
export interface PlatformLicense {
  machine_code: string
  license_pubkey_baked: boolean
  /** null = 不限企业数。 */
  max_tenants: number | null
  tenants_used: number
}

export interface TenantUsage {
  orgs: number
  users: number
  storage_used: number
}

/** GET /v1/platform/tenants[/{id}] 行/详情。 */
export interface TenantAdminView {
  id: string
  slug: string
  name: string
  plan: string
  /** -1 = 不限。 */
  max_orgs: number
  max_users_per_org: number
  storage_bytes: number
  active: boolean
  created_at: string
  usage: TenantUsage
}

export interface CreateTenantBody {
  company_name: string
  slug: string
  plan?: string
  admin_email: string
  admin_password: string
  admin_name?: string
}

/** PATCH 体：字段可选，传什么改什么。传 plan 自动套该档配额基线，显式字段再覆盖。 */
export interface UpdateTenantBody {
  plan?: string
  max_orgs?: number
  max_users_per_org?: number
  storage_bytes?: number
  active?: boolean
}

const base = '/v1/platform'

export const platformApi = {
  login: (email: string, password: string) =>
    platformRequest<SessionTokens>(`${base}/auth/login`, {
      method: 'POST',
      body: { email, password },
      skipAuthRefresh: true,
    }),

  logout: (refreshToken: string) =>
    platformRequest<void>(`${base}/auth/logout`, {
      method: 'POST',
      body: { refresh_token: refreshToken },
      skipAuthRefresh: true,
      responseType: 'void',
    }),

  me: () => platformRequest<PlatformMe>(`${base}/me`),

  stats: () => platformRequest<PlatformStats>(`${base}/stats`),

  license: () => platformRequest<PlatformLicense>(`${base}/license`),

  listTenants: (params: PageQuery = {}) =>
    platformRequest<Paginated<TenantAdminView>>(`${base}/tenants`, {
      query: { ...params },
    }),

  getTenant: (id: string) =>
    platformRequest<TenantAdminView>(`${base}/tenants/${id}`),

  createTenant: (body: CreateTenantBody) =>
    platformRequest<TenantAdminView>(`${base}/tenants`, {
      method: 'POST',
      body,
    }),

  updateTenant: (id: string, body: UpdateTenantBody) =>
    platformRequest<TenantAdminView>(`${base}/tenants/${id}`, {
      method: 'PATCH',
      body,
    }),

  suspend: (id: string) =>
    platformRequest<TenantAdminView>(`${base}/tenants/${id}/suspend`, {
      method: 'POST',
    }),

  activate: (id: string) =>
    platformRequest<TenantAdminView>(`${base}/tenants/${id}/activate`, {
      method: 'POST',
    }),
}
