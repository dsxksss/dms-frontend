import { createContext, useContext } from 'react'
import type { LoginRequest, Me } from '@/api/types'
import type { TenantSignupRequest, UserSignupRequest } from '@/api/auth'

export type AuthStatus = 'loading' | 'authed' | 'anon'

export interface AuthContextValue {
  status: AuthStatus
  me: Me | null
  login: (req: LoginRequest) => Promise<void>
  signupUser: (req: UserSignupRequest) => Promise<void>
  signupTenant: (req: TenantSignupRequest) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

/** 租户级 RBAC：检查 /me 的 permission keys。 */
export function hasPerm(me: Me | null, perm: string): boolean {
  return me?.permissions.includes(perm) ?? false
}

export function useCan(perm: string): boolean {
  const { me } = useAuth()
  return hasPerm(me, perm)
}

/** 后台管理权限：拥有任一管理类权限即视为可进 /admin。 */
export const ADMIN_PERMS = ['org:write', 'user:write', 'audit:read'] as const

export function isAdmin(me: Me | null): boolean {
  return ADMIN_PERMS.some((p) => hasPerm(me, p))
}

export function useIsAdmin(): boolean {
  const { me } = useAuth()
  return isAdmin(me)
}
