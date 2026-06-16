import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/auth/auth-context'
import { useUpdateMe, useUser } from '@/hooks/use-membership'
import { useToastError } from '@/hooks/use-toast-error'

export function ProfileCard() {
  const { t } = useTranslation()
  const { me } = useAuth()
  const card = useUser(me?.user_id)
  const update = useUpdateMe(me?.user_id)
  const toastError = useToastError()

  const [displayName, setDisplayName] = useState('')
  const [searchable, setSearchable] = useState(true)

  useEffect(() => {
    if (card.data) {
      setDisplayName(card.data.display_name ?? '')
      setSearchable(card.data.searchable ?? true)
    }
  }, [card.data])

  const save = async () => {
    try {
      await update.mutateAsync({ display_name: displayName, searchable })
      toast.success(t('settings.saved'))
    } catch (e) {
      toastError(e)
    }
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>{t('settings.profile')}</CardTitle>
        <p className="text-muted-foreground text-sm">{t('settings.profileDesc')}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {card.isLoading ? (
          <Skeleton className="h-9 w-full" />
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="displayName">{t('settings.displayName')}</Label>
              <Input
                id="displayName"
                placeholder={t('settings.displayNamePlaceholder')}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-0.5">
                <Label htmlFor="searchable">{t('settings.searchable')}</Label>
                <p className="text-muted-foreground text-xs">
                  {t('settings.searchableHint')}
                </p>
              </div>
              <Switch
                id="searchable"
                checked={searchable}
                onCheckedChange={setSearchable}
              />
            </div>
            <Button onClick={save} disabled={update.isPending}>
              {update.isPending && <Loader2 className="size-4 animate-spin" />}
              {t('settings.save')}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
