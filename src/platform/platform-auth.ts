import { createContext, useContext } from 'react'
import type { PlatformMe } from '@/platform/api'

export type PlatformAuthStatus = 'loading' | 'authed' | 'anon'

export interface PlatformAuthValue {
  status: PlatformAuthStatus
  me: PlatformMe | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export const PlatformAuthContext = createContext<PlatformAuthValue | null>(null)

export function usePlatformAuth(): PlatformAuthValue {
  const ctx = useContext(PlatformAuthContext)
  if (!ctx)
    throw new Error('usePlatformAuth must be used within PlatformAuthProvider')
  return ctx
}
