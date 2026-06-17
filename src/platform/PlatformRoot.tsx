import { Outlet } from 'react-router-dom'
import { PlatformAuthProvider } from '@/platform/PlatformAuthProvider'

/** /platform/* 子树根：提供独立的平台会话上下文（与租户 AuthProvider 互不影响）。 */
export function PlatformRoot() {
  return (
    <PlatformAuthProvider>
      <Outlet />
    </PlatformAuthProvider>
  )
}
