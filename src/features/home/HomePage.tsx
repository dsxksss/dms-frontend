import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from '@/components/theme-toggle'
import { LangToggle } from '@/components/lang-toggle'
import { useAuth } from '@/auth/auth-context'

/** M1 临时受保护首页：验证认证闭环。M2 由 AppLayout + Projects 取代。 */
export function HomePage() {
  const { t } = useTranslation('auth')
  const { me, logout } = useAuth()

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-2xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <span className="font-semibold tracking-tight">DMS</span>
        <div className="flex items-center gap-1">
          <LangToggle />
          <ThemeToggle />
          <Button variant="outline" size="sm" onClick={() => void logout()}>
            {t('logout')}
          </Button>
        </div>
      </header>

      <section className="space-y-3">
        <p className="text-muted-foreground text-sm">{t('signedInAs')}</p>
        <p className="font-mono text-sm">tenant: {me?.tenant_id}</p>
        <p className="font-mono text-sm">user: {me?.user_id ?? '-'}</p>
        <div className="flex flex-wrap gap-1.5">
          {me?.permissions.map((p) => (
            <Badge key={p} variant="secondary" className="font-mono text-xs">
              {p}
            </Badge>
          ))}
        </div>
      </section>
    </main>
  )
}
