import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useSetTenantActive, useUpdateTenant } from '@/hooks/use-platform'
import { useToastError } from '@/hooks/use-toast-error'
import { formatBytes } from '@/lib/format'
import type { TenantAdminView } from '@/platform/api'
import { PLAN_OPTIONS, planLabel } from './plans'

/** 配额数值展示：-1 → 不限。 */
function quotaText(n: number, unlimited: string, bytes = false): string {
  if (n < 0) return unlimited
  return bytes ? formatBytes(n) : String(n)
}

/**
 * 企业套餐 / 配额 / 状态控制卡：
 * 改档（PATCH plan，自动套该档配额基线）+ 配额读出 + 停用 / 恢复。
 */
export function TenantSettingsCard({ tenant }: { tenant: TenantAdminView }) {
  const { t } = useTranslation('platform')
  const update = useUpdateTenant(tenant.id)
  const setActive = useSetTenantActive(tenant.id)
  const toastError = useToastError()
  const [plan, setPlan] = useState(tenant.plan)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const unlimited = t('unlimited')
  const dirty = plan !== tenant.plan

  const savePlan = () => {
    update
      .mutateAsync({ plan })
      .then(() => toast.success(t('tenants.edit.saved')))
      .catch(toastError)
  }

  const onToggleActive = () => {
    // 停用为破坏性操作，先确认；恢复直接执行。
    if (tenant.active) {
      setConfirmOpen(true)
      return
    }
    setActive
      .mutateAsync(true)
      .then(() => toast.success(t('tenants.activatedDone')))
      .catch(toastError)
  }

  const doSuspend = () => {
    setActive
      .mutateAsync(false)
      .then(() => {
        toast.success(t('tenants.suspendedDone'))
        setConfirmOpen(false)
      })
      .catch((e) => {
        setConfirmOpen(false)
        toastError(e)
      })
  }

  return (
    <div className="card-shadow rounded-[14px] border bg-card p-[18px]">
      <h2 className="text-[15px] font-bold">{t('tenants.edit.title')}</h2>

      {/* 档位选择 + 保存 */}
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <div className="text-[11.5px] font-semibold text-muted-foreground">
            {t('tenants.columns.plan')}
          </div>
          <Select value={plan} onValueChange={setPlan}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLAN_OPTIONS.map((p) => (
                <SelectItem key={p} value={p}>
                  {planLabel(p, t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={savePlan} disabled={!dirty || update.isPending}>
          {update.isPending && <Loader2 className="size-4 animate-spin" />}
          {t('tenants.edit.save')}
        </Button>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        {t('tenants.create.planHint')}
      </p>

      {/* 配额读出 */}
      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-divider pt-4">
        <QuotaCell
          label={t('tenants.usageOrgs')}
          value={quotaText(tenant.max_orgs, unlimited)}
        />
        <QuotaCell
          label={t('tenants.usageUsers') + t('tenants.perOrg')}
          value={quotaText(tenant.max_users_per_org, unlimited)}
        />
        <QuotaCell
          label={t('tenants.usageStorage')}
          value={quotaText(tenant.storage_bytes, unlimited, true)}
        />
      </div>

      {/* 状态 */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-divider pt-4">
        <div>
          <div className="text-[12.5px] font-semibold">
            {t('tenants.lifecycle.title')}
          </div>
          <div className="mt-0.5 text-[11.5px] text-muted-foreground">
            {tenant.active
              ? t('tenants.lifecycle.suspendDesc')
              : t('tenants.lifecycle.activateDesc')}
          </div>
        </div>
        <Button
          variant={tenant.active ? 'destructive' : 'default'}
          onClick={onToggleActive}
          disabled={setActive.isPending}
        >
          {setActive.isPending && <Loader2 className="size-4 animate-spin" />}
          {tenant.active ? t('tenants.suspend') : t('tenants.activate')}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t('tenants.suspend')}
        description={t('tenants.lifecycle.suspendConfirm', { name: tenant.name })}
        confirmText={t('tenants.suspend')}
        destructive
        loading={setActive.isPending}
        onConfirm={doSuspend}
      />
    </div>
  )
}

function QuotaCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-semibold text-muted-foreground">
        {label}
      </div>
      <div className="mono mt-1 text-[14px] font-bold">{value}</div>
    </div>
  )
}
