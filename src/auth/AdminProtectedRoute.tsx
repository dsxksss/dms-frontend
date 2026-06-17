import { Navigate, Outlet, useLocation, Link } from 'react-router-dom'
import { Loader2, ShieldAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useAuth, isAdmin } from '@/auth/auth-context'

export function AdminProtectedRoute() {
  const { t } = useTranslation('admin')
  const { status, me, logout } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    )
  }
  if (status === 'anon') {
    return (
      <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
    )
  }
  if (!isAdmin(me)) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 p-6 text-center">
        <ShieldAlert className="text-muted-foreground size-10" />
        <div className="space-y-1">
          <p className="font-medium">{t('noAccess.title')}</p>
          <p className="text-muted-foreground text-sm">{t('noAccess.desc')}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/">{t('noAccess.toApp')}</Link>
          </Button>
          <Button variant="ghost" onClick={() => void logout()}>
            {t('logout', { ns: 'auth' })}
          </Button>
        </div>
      </div>
    )
  }
  return <Outlet />
}
