import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { usePlatformSettings, useUpdateTenant } from '@/hooks/use-platform'
import { useToastError } from '@/hooks/use-toast-error'
import type { PlatformSetting } from '@/platform/api'

/** 企业级配置覆盖：从平台目录（可编辑 + 即时项）选一项为该企业覆盖，浅合并进 tenants.settings。 */
export function TenantSettingsCard({
  tenantId,
  settings,
}: {
  tenantId: string
  settings?: Record<string, unknown>
}) {
  const { t } = useTranslation('platform')
  const catalog = usePlatformSettings()
  const update = useUpdateTenant(tenantId)
  const toastError = useToastError()

  const overridable = (catalog.data ?? []).filter(
    (s) => s.editable && s.apply === 'live',
  )
  const [key, setKey] = useState('')
  const [val, setVal] = useState<unknown>('')
  const selected = overridable.find((s) => s.key === key)

  const pick = (k: string) => {
    setKey(k)
    const s = overridable.find((x) => x.key === k)
    setVal(s?.value_type === 'bool' ? false : (s?.options?.[0] ?? ''))
  }

  const save = async () => {
    if (!key) return
    try {
      await update.mutateAsync({ settings: { [key]: val } })
      toast.success(t('settings.saved'))
      setKey('')
      setVal('')
    } catch (e) {
      toastError(e)
    }
  }

  const entries = Object.entries(settings ?? {})

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t('tenantSettings.title')}</CardTitle>
        <p className="text-muted-foreground text-sm">{t('tenantSettings.desc')}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {entries.length > 0 ? (
          <ul className="divide-y rounded-md border">
            {entries.map(([k, v]) => (
              <li
                key={k}
                className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
              >
                <span className="font-mono text-xs">{k}</span>
                <Badge variant="secondary">{String(v)}</Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">
            {t('tenantSettings.empty')}
          </p>
        )}

        <div className="flex flex-wrap items-end gap-2 rounded-lg border p-3">
          <div className="space-y-1.5">
            <Label>{t('tenantSettings.key')}</Label>
            <Select value={key} onValueChange={pick}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder={t('tenantSettings.pickKey')} />
              </SelectTrigger>
              <SelectContent>
                {overridable.map((s) => (
                  <SelectItem key={s.key} value={s.key}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selected && (
            <div className="space-y-1.5">
              <Label>{t('tenantSettings.value')}</Label>
              <ValueControl setting={selected} value={val} onChange={setVal} />
            </div>
          )}

          <Button
            size="sm"
            onClick={() => void save()}
            disabled={!key || update.isPending}
          >
            {update.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            {t('tenantSettings.override')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function ValueControl({
  setting,
  value,
  onChange,
}: {
  setting: PlatformSetting
  value: unknown
  onChange: (v: unknown) => void
}) {
  if (setting.value_type === 'bool') {
    return (
      <div className="flex h-9 items-center">
        <Switch checked={Boolean(value)} onCheckedChange={onChange} />
      </div>
    )
  }
  if (setting.value_type === 'enum') {
    return (
      <Select value={String(value ?? '')} onValueChange={onChange}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(setting.options ?? []).map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }
  return (
    <Input
      className="w-48"
      value={String(value ?? '')}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}
