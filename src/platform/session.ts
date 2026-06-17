import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * 平台超管会话存储（与租户会话 useSession 完全独立）。
 * 平台 token 是 tenant=nil + 权限键 platform:admin 的普通 JWT，但走独立的
 * /v1/platform/auth/* 登录与刷新端点，因此单独存一份，互不干扰。
 * access 仅驻内存；refresh 持久化以便刷新页面后静默换取新 access。
 */
type PlatformSessionState = {
  accessToken: string | null
  refreshToken: string | null
  setSession: (s: { accessToken: string; refreshToken: string }) => void
  setTokens: (accessToken: string, refreshToken: string) => void
  clear: () => void
}

export const usePlatformSession = create<PlatformSessionState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      setSession: ({ accessToken, refreshToken }) =>
        set({ accessToken, refreshToken }),
      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),
      clear: () => set({ accessToken: null, refreshToken: null }),
    }),
    {
      name: 'dms-platform-session',
      partialize: (s) => ({ refreshToken: s.refreshToken }),
    },
  ),
)
