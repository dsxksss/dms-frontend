import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Loader2, PauseCircle, PlayCircle } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { ErrorState } from '@/components/states'
import { ConfirmDialog } from '@/components/confirm-dialog'
import {
  useTenantDetail,
  useUpdateTenant,
  useSetTenantActive,
} from '@/hooks/use-platform'
import { useToastError } from '@/hooks/use-toast-error'
import { formatBytes, formatDateTime } from '@/lib/format'
import { codeOf, tintOf } from '@/lib/tile'
import type { UpdateTenantBody } from '@/platform/api'
import { PlanBadge } from './plan-badge'
import { TenantSettingsCard } from './TenantSettingsCard'
import { PLAN_OPTIONS, PLAN_BASELINE, planSummary, type PlanTier } from './plans'

interface QuotaForm {
  plan: string
  max_orgs: string
  max_users_per_org: string
  storage_bytes: string
}

export function TenantDetailPage() {
  const { id = '' } = useParams()
  const { t } = useTranslation('platform')
  const navigate = useNavigate()
  const toastError = useToastError()
  const query = useTenantDetail(id)
  const update = useUpdateTenant(id)
  const setActive = useSetTenantActive(id)

  const [form, setForm] = useState<QuotaForm | null>(null)
  const [confirmActive, setConfirmActive] = useState(false)

  // 详情到手后初始化编辑表单（仅首次/数据变化时）。
  useEffect(() => {
    if (query.data) {
      setForm({
        plan: query.data.plan,
        max_orgs: String(query.data.max_orgs),
        max_users_per_org: String(query.data.max_users_per_org),
        storage_bytes: String(query.data.storage_bytes),
      })
    }
  }, [query.data])

  const onPlanChange = (plan: string) => {
    const base = PLAN_BASELINE[plan as PlanTier]
    setForm((f) =>
      f
        ? {
            ...f,
            plan,
            // 选档自动带出该档默认三项配额，仍可手动微调。
            ...(base
              ? {
                  max_orgs: String(base.max_orgs),
                  max_users_per_org: String(base.max_users_per_org),
                  storage_bytes: String(base.storage_bytes),
                }
              : {}),
          }
        : f,
    )
  }

  const save = async () => {
    if (!form || !query.data) return
    const body: UpdateTenantBody = {}
    if (form.plan !== query.data.plan) body.plan = form.plan
    const mo = Number(form.max_orgs)
    const mu = Number(form.max_users_per_org)
    const sb = Number(form.storage_bytes)
    if (Number.isFinite(mo) && mo !== query.data.max_orgs) body.max_orgs = mo
    if (Number.isFinite(mu) && mu !== query.data.max_users_per_org)
      body.max_users_per_org = mu
    if (Number.isFinite(sb) && sb !== query.data.storage_bytes)
      body.storage_bytes = sb
    if (Object.keys(body).length === 0) {
      toast.info(t('tenants.edit.noChange'))
      return
    }
    try {
      await update.mutateAsync(body)
      toast.success(t('tenants.edit.saved'))
    } catch (e) {
      toastError(e)
    }
  }

  const toggleActive = async () => {
    if (!query.data) return
    try {
      await setActive.mutateAsync(!query.data.active)
      toast.success(
        query.data.active ? t('tenants.suspendedDone') : t('tenants.activatedDone'),
      )
      setConfirmActive(false)
    } catch (e) {
      toastError(e)
    }
  }

  if (query.isLoading) {
    return <Skeleton className="h-64 w-full" />
  }
  if (query.isError || !query.data) {
    return <ErrorState error={query.error} onRetry={() => query.refetch()} />
  }

  const d = query.data
  const storageHint = Number.isFinite(Number(form?.storage_bytes))
    ? formatBytes(Number(form?.storage_bytes))
    : ''

  const tint = tintOf(d.id)

  return (
    <div className="mx-auto max-w-[1180px] space-y-6">
      <div>
        <button
          onClick={() => navigate('..', { relative: 'path' })}
          className="text-muted-foreground hover:text-foreground mb-1.5 inline-flex items-center gap-1 text-[12.5px]"
        >
          <ArrowLeft className="size-3.5" />
          {t('tenants.back')}
        </button>
        <div className="flex items-center gap-3">
          <span
            className="flex size-[42px] shrink-0 items-center justify-center rounded-[11px] text-[14px] font-extrabold"
            style={{ background: tint.bg, color: tint.fg }}
          >
            {codeOf(d.name)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[22px] font-extrabold tracking-tight">{d.name}</h1>
              <PlanBadge plan={d.plan} />
              <Badge variant={d.active ? 'success' : 'neutral'}>
                {t(d.active ? 'tenants.active' : 'tenants.suspended')}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-0.5 font-mono text-[11.5px]">
              @{d.slug} · {formatDateTime(d.created_at)}
            </p>
          </div>
        </div>
      </div>

      {/* 用量 vs 配额 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('tenants.usageTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-3">
            <UsageRow
              label={t('tenants.usageOrgs')}
              used={d.usage.orgs}
              quota={d.max_orgs}
              unlimited={t('unlimited')}
            />
            <UsageRow
              label={t('tenants.usageUsers')}
              used={d.usage.users}
              quota={d.max_users_per_org}
              quotaSuffix={t('tenants.perOrg')}
              unlimited={t('unlimited')}
            />
            <UsageRow
              label={t('tenants.usageStorage')}
              usedText={formatBytes(d.usage.storage_used)}
              quotaText={
                d.storage_bytes < 0 ? t('unlimited') : formatBytes(d.storage_bytes)
              }
            />
          </dl>
        </CardContent>
      </Card>

      {/* 套餐 / 配额编辑 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('tenants.edit.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {form && (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
                void save()
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('tenants.create.plan')}</Label>
                  <Select value={form.plan} onValueChange={onPlanChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PLAN_OPTIONS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {t(`plan.${p}`)}
                          <span className="text-muted-foreground ml-1">
                            · {planSummary(p, t)}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qOrgs">{t('tenants.edit.maxOrgs')}</Label>
                  <Input
                    id="qOrgs"
                    type="number"
                    value={form.max_orgs}
                    onChange={(e) =>
                      setForm((f) => f && { ...f, max_orgs: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qUsers">{t('tenants.edit.maxUsers')}</Label>
                  <Input
                    id="qUsers"
                    type="number"
                    value={form.max_users_per_org}
                    onChange={(e) =>
                      setForm(
                        (f) => f && { ...f, max_users_per_org: e.target.value },
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qStorage">
                    {t('tenants.edit.storageBytes')}
                  </Label>
                  <Input
                    id="qStorage"
                    type="number"
                    value={form.storage_bytes}
                    onChange={(e) =>
                      setForm(
                        (f) => f && { ...f, storage_bytes: e.target.value },
                      )
                    }
                  />
                  <p className="text-muted-foreground text-xs">
                    {Number(form.storage_bytes) < 0
                      ? t('unlimited')
                      : storageHint}{' '}
                    · {t('tenants.edit.unlimitedHint')}
                  </p>
                </div>
              </div>

              <Button type="submit" disabled={update.isPending}>
                {update.isPending && <Loader2 className="size-4 animate-spin" />}
                {t('tenants.edit.save')}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* 停用 / 恢复 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {t('tenants.lifecycle.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <p className="text-muted-foreground text-sm">
            {d.active
              ? t('tenants.lifecycle.suspendDesc')
              : t('tenants.lifecycle.activateDesc')}
          </p>
          <Button
            variant={d.active ? 'outline' : 'default'}
            onClick={() => setConfirmActive(true)}
          >
            {d.active ? (
              <PauseCircle className="size-4" />
            ) : (
              <PlayCircle className="size-4" />
            )}
            {d.active ? t('tenants.suspend') : t('tenants.activate')}
          </Button>
        </CardContent>
      </Card>

      <TenantSettingsCard tenantId={d.id} settings={d.settings} />

      <ConfirmDialog
        open={confirmActive}
        onOpenChange={setConfirmActive}
        title={d.active ? t('tenants.suspend') : t('tenants.activate')}
        description={
          d.active
            ? t('tenants.lifecycle.suspendConfirm', { name: d.name })
            : t('tenants.lifecycle.activateConfirm', { name: d.name })
        }
        confirmText={d.active ? t('tenants.suspend') : t('tenants.activate')}
        destructive={d.active}
        loading={setActive.isPending}
        onConfirm={() => void toggleActive()}
      />
    </div>
  )
}

function UsageRow({
  label,
  used,
  quota,
  quotaSuffix,
  usedText,
  quotaText,
  unlimited,
}: {
  label: string
  used?: number
  quota?: number
  quotaSuffix?: string
  usedText?: string
  quotaText?: string
  unlimited?: string
}) {
  const right =
    quotaText ??
    (quota != null && quota < 0 ? unlimited : `${quota}${quotaSuffix ?? ''}`)
  const left = usedText ?? String(used ?? 0)
  return (
    <div className="space-y-1">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-sm font-medium tabular-nums">
        {left}
        <span className="text-muted-foreground"> / {right}</span>
      </dd>
    </div>
  )
}
