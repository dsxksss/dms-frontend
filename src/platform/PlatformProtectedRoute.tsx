import { Navigate, Outlet, useLocation, Link } from 'react-router-dom'
import { Loader2, ShieldAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { usePlatformAuth } from '@/platform/platform-auth'

export function PlatformProtectedRoute() {
  const { t } = useTranslation('platform')
  const { status, me, logout } = usePlatformAuth()
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
      <Navigate to="/system/login" replace state={{ from: location.pathname }} />
    )
  }
  if (!me?.platform_admin) {
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
            {t('logout')}
          </Button>
        </div>
      </div>
    )
  }
  return <Outlet />
}
