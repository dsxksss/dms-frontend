import { useEffect, useRef, useState, type ReactNode } from 'react'
import { authApi } from '@/api/auth'
import { useSession } from '@/auth/session'
import { AuthContext, type AuthStatus } from '@/auth/auth-context'
import type { LoginRequest, Me } from '@/api/types'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [me, setMe] = useState<Me | null>(null)
  const booted = useRef(false)

  // 启动引导：有 refresh token 则尝试拉 /me（client 会在 401 时自动用 refresh 换 access）。
  useEffect(() => {
    if (booted.current) return
    booted.current = true
    if (!useSession.getState().refreshToken) {
      setStatus('anon')
      return
    }
    authApi
      .me()
      .then((m) => {
        setMe(m)
        setStatus('authed')
      })
      .catch(() => {
        useSession.getState().clear()
        setMe(null)
        setStatus('anon')
      })
  }, [])

  const login = async (req: LoginRequest) => {
    const tokens = await authApi.login(req)
    useSession.getState().setSession({
      // 留空时由后端按 Host 推断；刷新时同样省略 tenant 走 Host。
      tenant: req.tenant ?? '',
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
    })
    const m = await authApi.me()
    setMe(m)
    setStatus('authed')
  }

  const logout = async () => {
    const { tenant, refreshToken } = useSession.getState()
    if (tenant && refreshToken) {
      try {
        await authApi.logout(tenant, refreshToken)
      } catch {
        // best effort：本地清理为准
      }
    }
    useSession.getState().clear()
    setMe(null)
    setStatus('anon')
  }

  return (
    <AuthContext.Provider value={{ status, me, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
