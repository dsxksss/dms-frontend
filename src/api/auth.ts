import { request } from '@/api/client'
import type { LoginRequest, Me, SessionTokens } from '@/api/types'

export interface UserSignupRequest {
  tenant?: string
  email: string
  password: string
  name?: string
}

export interface TenantSignupRequest {
  company_name: string
  slug?: string
  plan?: string
  admin_email: string
  admin_password: string
  admin_name?: string
}

export const authApi = {
  login: (req: LoginRequest) =>
    request<SessionTokens>('/v1/auth/login', {
      method: 'POST',
      body: req,
      skipAuthRefresh: true,
    }),

  signupUser: (req: UserSignupRequest) =>
    request<SessionTokens>('/v1/signup', {
      method: 'POST',
      body: req,
      skipAuthRefresh: true,
    }),

  signupTenant: (req: TenantSignupRequest) =>
    request<SessionTokens>('/v1/signup/tenant', {
      method: 'POST',
      body: req,
      skipAuthRefresh: true,
    }),

  logout: (tenant: string, refreshToken: string) =>
    request<void>('/v1/auth/logout', {
      method: 'POST',
      body: { tenant, refresh_token: refreshToken },
      skipAuthRefresh: true,
      responseType: 'void',
    }),

  me: () => request<Me>('/v1/me'),
}
