import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ThemeToggle } from '@/components/theme-toggle'
import { LangToggle } from '@/components/lang-toggle'
import { ProfileCard } from './ProfileCard'

export function SettingsPage() {
  const { t } = useTranslation()
  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.settings')}
        titleI18n={{ key: 'nav.settings', ns: 'common' }}
      />
      <ProfileCard />
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>{t('settings.appearance')}</CardTitle>
          <p className="text-muted-foreground text-sm">
            {t('settings.appearanceDesc')}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">{t('theme.label')}</span>
            <ThemeToggle />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">{t('lang.label')}</span>
            <LangToggle />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
