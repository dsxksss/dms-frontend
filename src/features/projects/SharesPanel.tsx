import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Plus, Share2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { roleTone } from '@/lib/tone'
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
        <h2 className="flex items-center gap-2 font-medium">
          <Share2 className="size-4" />
          {t('shares.title')}
        </h2>
        <p className="text-muted-foreground text-sm">{t('shares.desc')}</p>
      </div>

      {canManage && (
        <div className="flex flex-wrap items-end gap-2 rounded-lg border p-3">
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
        </div>
      )}

      {shares.isLoading ? (
        <TableSkeleton rows={2} cols={2} />
      ) : shares.data && shares.data.length > 0 ? (
        <ul className="divide-y rounded-md border">
          {shares.data.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-2 px-4 py-3 text-sm"
            >
              <span className="flex items-center gap-2">
                <span className="font-medium">{orgName(s.org_id)}</span>
                <Badge variant={roleTone(s.role)}>{t(`roles.${s.role}`)}</Badge>
              </span>
              {canManage && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => setRemoveTarget(s)}
                >
                  <Trash2 className="text-destructive size-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
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
