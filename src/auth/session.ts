import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * 会话存储。access token 仅驻内存（不持久化）；refresh token 与 tenant 持久化，
 * 以便刷新页面后用 refresh 静默换取新 access（见 api/client 的 401 拦截）。
 */
type SessionState = {
  tenant: string | null
  accessToken: string | null
  refreshToken: string | null
  /** 登录/交换成功后写入完整会话。 */
  setSession: (s: {
    tenant: string
    accessToken: string
    refreshToken: string
  }) => void
  /** 刷新成功后更新（refresh 会轮换，需一并更新）。 */
  setTokens: (accessToken: string, refreshToken: string) => void
  clear: () => void
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      tenant: null,
      accessToken: null,
      refreshToken: null,
      setSession: ({ tenant, accessToken, refreshToken }) =>
        set({ tenant, accessToken, refreshToken }),
      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),
      clear: () =>
        set({ tenant: null, accessToken: null, refreshToken: null }),
    }),
    {
      name: 'dms-session',
      partialize: (s) => ({ tenant: s.tenant, refreshToken: s.refreshToken }),
    },
  ),
)
