import { useEffect, useRef, useState, type ReactNode } from 'react'
import { authApi } from '@/api/auth'
import type { TenantSignupRequest, UserSignupRequest } from '@/api/auth'
import { useSession } from '@/auth/session'
import { AuthContext, type AuthStatus } from '@/auth/auth-context'
import type { LoginRequest, Me, SessionTokens } from '@/api/types'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [me, setMe] = useState<Me | null>(null)
  const booted = useRef(false)

  // 启动时：有 refresh token 则尝试拉 /me（client 会在 401 时自动用 refresh 换 access）。
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

  const applySession = async (tenant: string, tokens: SessionTokens) => {
    useSession.getState().setSession({
      // 优先用后端回传的 tenant（用户只填邮箱时由后端反查得出），回退到请求里的。
      tenant: tokens.tenant ?? tenant,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
    })
    const m = await authApi.me()
    setMe(m)
    setStatus('authed')
  }

  const login = async (req: LoginRequest) => {
    // 留空时由后端按 Host 推断；刷新时同样省略 tenant 走 Host。
    await applySession(req.tenant ?? '', await authApi.login(req))
  }

  const loginWemol = async (req: {
    name: string
    passwd: string
    tenant?: string
  }) => {
    // token 为 JSON 凭据；DMS 代向 WeMol 换会话并 JIT 映射本地用户。
    const tokens = await authApi.tokenExchange({
      provider: 'wemol',
      token: JSON.stringify({ name: req.name, passwd: req.passwd }),
      tenant: req.tenant,
    })
    await applySession(req.tenant ?? '', tokens)
  }

  const signupUser = async (req: UserSignupRequest) => {
    // tenant 由后端在注册响应里回传（applySession 优先用 tokens.tenant）。
    await applySession('', await authApi.signupUser(req))
  }

  const signupTenant = async (req: TenantSignupRequest) => {
    await applySession(req.slug ?? '', await authApi.signupTenant(req))
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
    <AuthContext.Provider
      value={{ status, me, login, loginWemol, signupUser, signupTenant, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}
