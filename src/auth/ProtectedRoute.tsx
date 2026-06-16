import { Navigate, Outlet } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/auth/auth-context'

export function ProtectedRoute() {
  const { status } = useAuth()

  if (status === 'loading') {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    )
  }
  if (status === 'anon') return <Navigate to="/login" replace />
  return <Outlet />
}
