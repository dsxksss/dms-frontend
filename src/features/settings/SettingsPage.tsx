import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { PageHeader } from '@/components/page-header'
import { useAuth } from '@/auth/auth-context'
import { useUpdateMe, useUser } from '@/hooks/use-membership'
import { useToastError } from '@/hooks/use-toast-error'

export function SettingsPage() {
  const { t, i18n } = useTranslation('common')
  const { me } = useAuth()
  const profile = useUser(me?.user_id)
  const update = useUpdateMe(me?.user_id)
  const toastError = useToastError()
  const [displayName, setDisplayName] = useState('')
  const [searchable, setSearchable] = useState(true)

  useEffect(() => {
    if (profile.data) {
      setDisplayName(profile.data.display_name)
      setSearchable(profile.data.searchable ?? true)
    }
  }, [profile.data])

  const save = async () => {
    try {
      await update.mutateAsync({ display_name: displayName, searchable })
      toast.success(t('settings.saved'))
    } catch (e) {
      toastError(e)
    }
  }

  const isZh = i18n.language.startsWith('zh')

  return (
    <div className="mx-auto max-w-[680px] px-8 py-7">
      <PageHeader title={t('nav.settings')} titleEn="Settings" size="md" />

      <Card className="gap-0 p-0">
        <div className="border-b px-5 py-4">
          <div className="text-[14px] font-bold">{t('settings.profile')}</div>
          <div className="text-[12px] text-muted-foreground">
            {t('settings.profileDesc')}
          </div>
        </div>
        <div className="space-y-4 px-5 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="display-name">{t('settings.displayName')}</Label>
            <Input
              id="display-name"
              placeholder={t('settings.displayNamePlaceholder')}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Label className="font-bold">{t('settings.searchable')}</Label>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                {t('settings.searchableHint')}
              </p>
            </div>
            <Switch checked={searchable} onCheckedChange={setSearchable} />
          </div>
          <div className="flex justify-end">
            <Button onClick={save} disabled={update.isPending}>
              {update.isPending && <Loader2 className="size-4 animate-spin" />}
              {t('settings.save')}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="mt-4 gap-0 p-0">
        <div className="border-b px-5 py-4">
          <div className="text-[14px] font-bold">{t('settings.appearance')}</div>
          <div className="text-[12px] text-muted-foreground">
            {t('settings.appearanceDesc')}
          </div>
        </div>
        <div className="flex items-center justify-between px-5 py-4">
          <Label className="font-bold">{t('lang.label')}</Label>
          <div className="flex gap-2">
            <Button
              variant={isZh ? 'default' : 'outline'}
              size="sm"
              onClick={() => void i18n.changeLanguage('zh-CN')}
            >
              {t('lang.zh-CN')}
            </Button>
            <Button
              variant={!isZh ? 'default' : 'outline'}
              size="sm"
              onClick={() => void i18n.changeLanguage('en')}
            >
              {t('lang.en')}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
