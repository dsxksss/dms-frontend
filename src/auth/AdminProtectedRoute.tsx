import { Navigate, Outlet, useLocation, Link } from 'react-router-dom'
import { Loader2, ShieldAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useAuth, isAdmin } from '@/auth/auth-context'
import { useAdminAccess } from '@/hooks/use-orgs'

export function AdminProtectedRoute() {
  const { t } = useTranslation('admin')
  const { status, me, logout } = useAuth()
  const { loading, hasOrgs } = useAdminAccess()
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

  const admin = isAdmin(me)
  // 有管理权限但还在查组织 → 等一下，避免闪现"无权限"。
  if (admin && loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    )
  }
  // 无管理权限，或虽有权限但没有任何组织（个人用户）→ 挡住，文案区分两种原因。
  if (!admin || !hasOrgs) {
    const noOrg = admin && !hasOrgs
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 p-6 text-center">
        <ShieldAlert className="text-muted-foreground size-10" />
        <div className="space-y-1">
          <p className="font-medium">
            {noOrg ? t('noAccess.noOrgTitle') : t('noAccess.title')}
          </p>
          <p className="text-muted-foreground max-w-[42ch] text-sm">
            {noOrg ? t('noAccess.noOrgDesc') : t('noAccess.desc')}
          </p>
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
