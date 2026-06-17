import { useEffect, useRef, useState, type ReactNode } from 'react'
import { platformApi, type PlatformMe } from '@/platform/api'
import { usePlatformSession } from '@/platform/session'
import {
  PlatformAuthContext,
  type PlatformAuthStatus,
} from '@/platform/platform-auth'
import type { SessionTokens } from '@/api/types'

export function PlatformAuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<PlatformAuthStatus>('loading')
  const [me, setMe] = useState<PlatformMe | null>(null)
  const booted = useRef(false)

  // 启动引导：有 refresh token 则尝试拉 /platform/me（client 会在 401 时自动刷新）。
  useEffect(() => {
    if (booted.current) return
    booted.current = true
    if (!usePlatformSession.getState().refreshToken) {
      setStatus('anon')
      return
    }
    platformApi
      .me()
      .then((m) => {
        setMe(m)
        setStatus('authed')
      })
      .catch(() => {
        usePlatformSession.getState().clear()
        setMe(null)
        setStatus('anon')
      })
  }, [])

  const applySession = async (tokens: SessionTokens) => {
    usePlatformSession.getState().setSession({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
    })
    const m = await platformApi.me()
    setMe(m)
    setStatus('authed')
  }

  const login = async (email: string, password: string) => {
    await applySession(await platformApi.login(email, password))
  }

  const logout = async () => {
    const { refreshToken } = usePlatformSession.getState()
    if (refreshToken) {
      try {
        await platformApi.logout(refreshToken)
      } catch {
        // best effort：本地清理为准
      }
    }
    usePlatformSession.getState().clear()
    setMe(null)
    setStatus('anon')
  }

  return (
    <PlatformAuthContext.Provider value={{ status, me, login, logout }}>
      {children}
    </PlatformAuthContext.Provider>
  )
}
