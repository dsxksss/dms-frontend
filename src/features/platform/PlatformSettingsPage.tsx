import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Loader2, Lock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageHeader } from '@/components/page-header'
import { ErrorState } from '@/components/states'
import { Skeleton } from '@/components/ui/skeleton'
import { applyTone } from '@/components/tone'
import {
  usePlatformSettings,
  useUpdatePlatformSettings,
} from '@/hooks/use-platform'
import { useToastError } from '@/hooks/use-toast-error'
import type { PlatformSetting } from '@/platform/api'

function settingLabel(setting: PlatformSetting, language: string) {
  if (language.toLowerCase().startsWith('zh')) {
    return setting.zh_label || setting.label || setting.name || setting.key
  }
  return setting.en_label || setting.label || setting.name || setting.key
}

export function PlatformSettingsPage() {
  const { t } = useTranslation('platform')
  const query = usePlatformSettings()
  const update = useUpdatePlatformSettings()
  const toastError = useToastError()
  // 草稿：仅记录被改过的 key→新值；当前值 = draft[key] ?? setting.value。
  const [draft, setDraft] = useState<Record<string, unknown>>({})

  const settings = query.data ?? []
  const dirtyKeys = Object.keys(draft).filter((k) => {
    const s = settings.find((x) => x.key === k)
    return s && draft[k] !== s.value
  })
  const dirty = dirtyKeys.length > 0

  const setValue = (key: string, value: unknown) =>
    setDraft((d) => ({ ...d, [key]: value }))

  const save = () => {
    if (!dirty) return
    const body = Object.fromEntries(dirtyKeys.map((k) => [k, draft[k]]))
    update
      .mutateAsync(body)
      .then(() => {
        toast.success(t('settings.saved'))
        setDraft({})
      })
      .catch(toastError)
  }

  return (
    <div className="mx-auto max-w-[1180px] px-8 py-7">
      <PageHeader
        title={t('settings.title')}
        titleEn="Settings"
        description={t('settings.desc')}
        actions={
          <Button onClick={save} disabled={!dirty || update.isPending}>
            {update.isPending && <Loader2 className="size-4 animate-spin" />}
            {t('settings.save')}
          </Button>
        }
      />

      {query.isLoading ? (
        <Card className="mx-auto max-w-[840px] gap-0 p-0">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="border-b border-divider p-4 last:border-b-0">
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </Card>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <Card className="mx-auto max-w-[840px] gap-0 py-0">
          {settings.map((s, i) => (
            <SettingRow
              key={s.key}
              setting={s}
              value={s.key in draft ? draft[s.key] : s.value}
              onChange={(v) => setValue(s.key, v)}
              last={i === settings.length - 1}
            />
          ))}
        </Card>
      )}
    </div>
  )
}

function SettingRow({
  setting,
  value,
  onChange,
  last,
}: {
  setting: PlatformSetting
  value: unknown
  onChange: (v: unknown) => void
  last: boolean
}) {
  const { t, i18n } = useTranslation('platform')
  const tone = applyTone(setting.apply)
  const applyLabel =
    setting.apply === 'restart' ? t('settings.restart') : t('settings.live')
  // 字段说明（platform.settings.fields.<key>），缺省回退到接口给的 label。
  const hint = t(`settings.fields.${setting.key}`, { defaultValue: '' })

  return (
    <div
      className="flex flex-wrap items-start justify-between gap-4 border-b border-divider px-5 py-4 last:border-b-0"
      style={last ? { borderBottom: 'none' } : undefined}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-bold">
            {settingLabel(setting, i18n.language)}
          </span>
          <Badge variant={tone}>{applyLabel}</Badge>
          {!setting.editable && (
            <span
              className="inline-flex items-center"
              title={t('settings.readonly')}
            >
              <Lock className="size-3.5 text-muted-foreground" />
            </span>
          )}
        </div>
        <div className="mono mt-1 text-[11px] text-muted-foreground">
          {setting.key}
        </div>
        {hint && (
          <p className="mt-1.5 max-w-[460px] text-[11.5px] leading-relaxed text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center justify-end pt-0.5">
        <SettingControl setting={setting} value={value} onChange={onChange} />
      </div>
    </div>
  )
}

function SettingControl({
  setting,
  value,
  onChange,
}: {
  setting: PlatformSetting
  value: unknown
  onChange: (v: unknown) => void
}) {
  // 只读项：脱敏值以灰字 mono 展示。
  if (!setting.editable) {
    const display = setting.secret
      ? '***'
      : value === '' || value == null
        ? '—'
        : String(value)
    return <span className="mono text-[12.5px] text-muted-foreground">{display}</span>
  }

  if (setting.value_type === 'bool') {
    return (
      <Switch checked={Boolean(value)} onCheckedChange={(v) => onChange(v)} />
    )
  }

  if (setting.value_type === 'enum') {
    return (
      <Select value={String(value ?? '')} onValueChange={onChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(setting.options ?? []).map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  return (
    <Input
      className="w-[240px]"
      value={setting.secret ? '' : String(value ?? '')}
      placeholder={setting.secret ? '***' : undefined}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}
