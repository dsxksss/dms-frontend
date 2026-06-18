import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Plus, Share2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { RowList, Row } from '@/components/row-list'
import { roleTone } from '@/lib/tone'
import { tintOf } from '@/lib/tile'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { EmptyState, TableSkeleton } from '@/components/states'
import {
  useAddShare,
  useProjectRole,
  useRemoveShare,
  useShares,
} from '@/hooks/use-projects'
import { useOrgs } from '@/hooks/use-orgs'
import { useToastError } from '@/hooks/use-toast-error'
import { roleAtLeast, type ProjectRole } from '@/lib/roles'
import type { ProjectShare } from '@/api/projects'

const SHARE_ROLES: ProjectRole[] = ['viewer', 'contributor', 'manager']
const ALL = '__all'

export function SharesPanel({ projectId }: { projectId: string }) {
  const { t } = useTranslation('projects')
  const role = useProjectRole(projectId)
  const canManage = roleAtLeast(role, 'manager')
  const shares = useShares(projectId)
  const orgs = useOrgs()
  const add = useAddShare(projectId)
  const remove = useRemoveShare(projectId)
  const toastError = useToastError()

  const [org, setOrg] = useState(ALL)
  const [shareRole, setShareRole] = useState<ProjectRole>('viewer')
  const [removeTarget, setRemoveTarget] = useState<ProjectShare | null>(null)

  const orgName = (id: string | null) =>
    id ? (orgs.data?.find((o) => o.id === id)?.name ?? id) : t('shares.allOrgs')

  const onAdd = async () => {
    try {
      await add.mutateAsync({
        org_id: org === ALL ? undefined : org,
        role: shareRole,
      })
      toast.success(t('shares.added'))
    } catch (e) {
      toastError(e)
    }
  }

  const onRemove = async () => {
    if (!removeTarget) return
    try {
      await remove.mutateAsync(removeTarget.id)
      toast.success(t('shares.removed'))
      setRemoveTarget(null)
    } catch (e) {
      toastError(e)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-[15px] font-bold">
          <Share2 className="size-4" />
          {t('shares.title')}
        </h2>
        <p className="text-muted-foreground text-[13px]">{t('shares.desc')}</p>
      </div>

      {canManage && (
        <Card className="flex flex-row flex-wrap items-end gap-2 p-4">
          <div className="space-y-1.5">
            <Label>{t('shares.org')}</Label>
            <Select value={org} onValueChange={setOrg}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('shares.allOrgs')}</SelectItem>
                {(orgs.data ?? []).map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t('shares.role')}</Label>
            <Select
              value={shareRole}
              onValueChange={(v) => setShareRole(v as ProjectRole)}
            >
              <SelectTrigger className="w-40">
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
          <Button onClick={onAdd} disabled={add.isPending}>
            {add.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            {t('shares.add')}
          </Button>
        </Card>
      )}

      {shares.isLoading ? (
        <TableSkeleton rows={2} cols={2} />
      ) : shares.data && shares.data.length > 0 ? (
        <RowList>
          {shares.data.map((s) => {
            const tint = tintOf(s.org_id ?? 'all')
            return (
              <Row key={s.id}>
                <span
                  className="flex size-[30px] shrink-0 items-center justify-center rounded-[8px]"
                  style={{ background: tint.bg, color: tint.fg }}
                >
                  <Building2 className="size-4" />
                </span>
                <span className="min-w-0 flex-1 truncate font-semibold">
                  {orgName(s.org_id)}
                </span>
                <Badge variant={roleTone(s.role)}>{t(`roles.${s.role}`)}</Badge>
                {canManage && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setRemoveTarget(s)}
                    aria-label={t('shares.removeTitle')}
                  >
                    <Trash2 className="text-destructive size-4" />
                  </Button>
                )}
              </Row>
            )
          })}
        </RowList>
      ) : (
        <EmptyState title={t('shares.empty')} />
      )}

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(o) => !o && setRemoveTarget(null)}
        title={t('shares.removeTitle')}
        destructive
        loading={remove.isPending}
        onConfirm={onRemove}
      />
    </div>
  )
}
