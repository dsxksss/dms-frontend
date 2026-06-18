import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Lock } from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ErrorState } from '@/components/states'
import {
  usePlatformSettings,
  useUpdatePlatformSettings,
} from '@/hooks/use-platform'
import { useToastError } from '@/hooks/use-toast-error'
import { planSummary } from './plans'
import type { PlatformSetting } from '@/platform/api'

export function PlatformSettingsPage() {
  const { t } = useTranslation('platform')
  const query = usePlatformSettings()
  const update = useUpdatePlatformSettings()
  const toastError = useToastError()
  // 仅记录被改动的项；未改动的不发，避免把脱敏的 "***" 回写。
  const [draft, setDraft] = useState<Record<string, unknown>>({})

  const set = (key: string, v: unknown) => setDraft((d) => ({ ...d, [key]: v }))
  const dirty = Object.keys(draft).length > 0

  const save = async () => {
    try {
      await update.mutateAsync(draft)
      toast.success(t('settings.saved'))
      setDraft({})
    } catch (e) {
      toastError(e)
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('settings.title')}
        titleI18n={{ key: 'settings.title', ns: 'platform' }}
        description={t('settings.desc')}
        actions={
          <Button onClick={() => void save()} disabled={!dirty || update.isPending}>
            {update.isPending && <Loader2 className="size-4 animate-spin" />}
            {t('settings.save')}
          </Button>
        }
      />

      {query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="divide-y rounded-lg border">
          {(query.data ?? []).map((s) => (
            <SettingRow
              key={s.key}
              setting={s}
              draftValue={s.key in draft ? draft[s.key] : undefined}
              onChange={(v) => set(s.key, v)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SettingRow({
  setting,
  draftValue,
  onChange,
}: {
  setting: PlatformSetting
  draftValue: unknown
  onChange: (v: unknown) => void
}) {
  const { t } = useTranslation('platform')
  const dirty = draftValue !== undefined
  const current = dirty ? draftValue : setting.value
  // 用人话说明替代原始 key；说明缺省时回退 key。原始 key 移到 ⓘ 悬浮提示里。
  const desc = t(`settings.fields.${setting.key}`, { defaultValue: '' })
  const isPlan = setting.key === 'signup.default_plan'
  const enumLabel = (o: string) => (isPlan ? t(`plan.${o}`, { defaultValue: o }) : o)

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0 space-y-0.5">
        <div className="flex items-center gap-2">
          <Label className="font-medium">{setting.label}</Label>
          {setting.apply === 'restart' && (
            <Badge variant="outline" className="text-muted-foreground text-xs">
              {t('settings.restart')}
            </Badge>
          )}
          {!setting.editable && (
            <Badge variant="outline" className="text-muted-foreground gap-1 text-xs">
              <Lock className="size-3" />
              {t('settings.readonly')}
            </Badge>
          )}
        </div>
        {desc && <p className="text-muted-foreground text-xs">{desc}</p>}
      </div>

      <div className="w-72 shrink-0">
        {!setting.editable ? (
          <p className="text-muted-foreground truncate text-right text-sm">
            {setting.secret ? '***' : String(setting.value ?? '-')}
          </p>
        ) : setting.value_type === 'bool' ? (
          <div className="flex justify-end">
            <Switch
              checked={Boolean(current)}
              onCheckedChange={(c) => onChange(c)}
            />
          </div>
        ) : setting.value_type === 'enum' ? (
          <Select value={String(current ?? '')} onValueChange={onChange}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(setting.options ?? []).map((o) => (
                <SelectItem key={o} value={o}>
                  {enumLabel(o)}
                  {isPlan && (
                    <span className="text-muted-foreground ml-1">
                      · {planSummary(o, t)}
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            value={String(current ?? '')}
            placeholder={setting.secret ? '***' : undefined}
            onChange={(e) => onChange(e.target.value)}
          />
        )}
      </div>
    </div>
  )
}
