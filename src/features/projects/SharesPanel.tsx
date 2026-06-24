import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Plus, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { InfoHint } from '@/components/info-hint'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EmptyState } from '@/components/states'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { roleTone } from '@/components/tone'
import { useOrgs } from '@/hooks/use-orgs'
import { useAddShare, useRemoveShare, useShares } from '@/hooks/use-projects'
import { useToastError } from '@/hooks/use-toast-error'
import type { ProjectRole } from '@/lib/roles'
import type { ProjectShare } from '@/api/projects'

// 共享角色不含 owner（跨组织最高授到 manager 级）。
const SHARE_ROLES: ProjectRole[] = ['viewer', 'contributor', 'manager']
const ALL_ORGS = '__all__'

/** 跨组织共享：列出共享（组织名 / 集团共享）+ 新增（组织 + 角色）+ 移除。 */
export function SharesPanel({ projectId }: { projectId: string }) {
  const { t } = useTranslation('projects')
  const shares = useShares(projectId)
  const add = useAddShare(projectId)
  const remove = useRemoveShare(projectId)
  const orgs = useOrgs()
  const toastError = useToastError()
  const [orgId, setOrgId] = useState<string>(ALL_ORGS)
  const [role, setRole] = useState<ProjectRole>('viewer')
  const [removeTarget, setRemoveTarget] = useState<ProjectShare | null>(null)

  const orgName = (id: string | null) =>
    id ? orgs.data?.find((o) => o.id === id)?.name ?? id : t('shares.allOrgs')

  const doAdd = () => {
    add
      .mutateAsync({ org_id: orgId === ALL_ORGS ? undefined : orgId, role })
      .then(() => {
        toast.success(t('shares.added'))
        setOrgId(ALL_ORGS)
        setRole('viewer')
      })
      .catch(toastError)
  }

  const rows = shares.data ?? []

  return (
    <div className="space-y-3">
      <p className="text-[12.5px] leading-relaxed text-muted-foreground">
        {t('shares.desc')}
      </p>

      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-[12px]">
            {t('shares.org')}
            <InfoHint>{t('shares.scopeHint')}</InfoHint>
          </Label>
          <Select value={orgId} onValueChange={setOrgId}>
            <SelectTrigger className="h-9 w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_ORGS}>{t('shares.allOrgs')}</SelectItem>
              {(orgs.data ?? []).map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[12px]">{t('shares.role')}</Label>
          <Select
            value={role}
            onValueChange={(v) => setRole(v as ProjectRole)}
          >
            <SelectTrigger className="h-9 w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SHARE_ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {t(`roles.${r}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={doAdd} disabled={add.isPending}>
          <Plus className="size-4" />
          {t('shares.add')}
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState title={t('shares.empty')} />
      ) : (
        <div className="overflow-hidden rounded-[12px] border border-divider">
          {rows.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-3 border-b border-divider px-3.5 py-2.5 last:border-b-0"
            >
              <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">
                {orgName(s.org_id)}
              </span>
              <Badge variant={roleTone(s.role)}>{t(`roles.${s.role}`)}</Badge>
              <Button
                variant="ghost"
                size="icon-sm"
                title={t('shares.removeTitle')}
                onClick={() => setRemoveTarget(s)}
              >
                <X className="size-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(o) => !o && setRemoveTarget(null)}
        title={t('shares.removeTitle')}
        destructive
        confirmText={t('row.delete')}
        loading={remove.isPending}
        onConfirm={() => {
          if (!removeTarget) return
          remove
            .mutateAsync(removeTarget.id)
            .then(() => {
              toast.success(t('shares.removed'))
              setRemoveTarget(null)
            })
            .catch(toastError)
        }}
      />
    </div>
  )
}
