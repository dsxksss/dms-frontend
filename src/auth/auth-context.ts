import { createContext, useContext } from 'react'
import type { LoginRequest, Me } from '@/api/types'

export type AuthStatus = 'loading' | 'authed' | 'anon'

export interface AuthContextValue {
  status: AuthStatus
  me: Me | null
  login: (req: LoginRequest) => Promise<void>
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
