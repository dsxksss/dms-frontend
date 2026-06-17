import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Building2, ScrollText, Users } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const CARDS = [
  { to: '/admin/orgs', icon: Building2, key: 'orgs', nav: 'nav.orgs' },
  { to: '/admin/users', icon: Users, key: 'users', nav: 'nav.users' },
  { to: '/admin/audit', icon: ScrollText, key: 'audit', nav: 'nav.audit' },
] as const

export function AdminOverviewPage() {
  const { t } = useTranslation('admin')
  return (
    <div>
      <PageHeader title={t('overview.welcome')} description={t('overview.welcomeDesc')} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((c) => (
          <Link key={c.to} to={c.to}>
            <Card className="hover:border-brand/50 h-full transition-colors">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <c.icon className="text-muted-foreground size-4" />
                  {t(c.nav)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">
                {t(`overview.${c.key}`)}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
