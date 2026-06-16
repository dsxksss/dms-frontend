import type { ReactNode } from 'react'
import { useCan } from '@/auth/auth-context'

/** 租户级权限门：有 perm 才渲染 children，否则 fallback。 */
export function Can({
  perm,
  children,
  fallback = null,
}: {
  perm: string
  children: ReactNode
  fallback?: ReactNode
}) {
  return <>{useCan(perm) ? children : fallback}</>
}
