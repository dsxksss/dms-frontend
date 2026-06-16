import { request } from '@/api/client'
import type { LoginRequest, Me, SessionTokens } from '@/api/types'

export const authApi = {
  login: (req: LoginRequest) =>
    request<SessionTokens>('/v1/auth/login', {
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
