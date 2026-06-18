import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Trash2, User } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { EmptyState, ErrorState, TableSkeleton } from '@/components/states'
import { useAuth } from '@/auth/auth-context'
import { useMembers, useProjectRole, useRemoveMember } from '@/hooks/use-projects'
import {
  useInviteToProject,
  useProjectInvitations,
  useRevokeInvitation,
} from '@/hooks/use-membership'
import { useToastError } from '@/hooks/use-toast-error'
import { PROJECT_ROLES, roleAtLeast } from '@/lib/roles'
import { roleTone } from '@/lib/tone'
import { tintOf } from '@/lib/tile'
import { UserName } from '@/components/user-name'
import type { Member } from '@/api/projects'
import { InvitePanel } from '@/features/membership/InvitePanel'

export function MembersPanel({ projectId }: { projectId: string }) {
  const { t } = useTranslation('membership')
  const { t: tp } = useTranslation('projects')
  const { me } = useAuth()
  const role = useProjectRole(projectId)
  const canManage = roleAtLeast(role, 'manager')
  const members = useMembers(projectId)
  const remove = useRemoveMember(projectId)
  const invitations = useProjectInvitations(projectId)
  const invite = useInviteToProject(projectId)
  const revoke = useRevokeInvitation()
  const toastError = useToastError()
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null)

  const onRemove = async () => {
    if (!removeTarget) return
    try {
      await remove.mutateAsync(removeTarget.user_id)
      toast.success(t('members.removed'))
      setRemoveTarget(null)
    } catch (e) {
      toastError(e)
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-3">
        <h2 className="text-[15px] font-bold">{t('members.title')}</h2>
        {members.isLoading ? (
          <TableSkeleton rows={3} cols={2} />
        ) : members.isError ? (
          <ErrorState error={members.error} onRetry={() => members.refetch()} />
        ) : members.data && members.data.length > 0 ? (
          <Card className="gap-0 py-0">
            {members.data.map((m, i) => (
              <div
                key={m.user_id}
                className={
                  'flex items-center gap-3 px-4 py-3 ' +
                  (i < members.data.length - 1 ? 'border-divider border-b' : '')
                }
              >
                <span
                  className="flex size-[30px] shrink-0 items-center justify-center rounded-full text-white"
                  style={{ background: tintOf(m.user_id).fg }}
                >
                  <User className="size-4" />
                </span>
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <UserName id={m.user_id} className="truncate text-[13px] font-semibold" />
                  {me?.user_id === m.user_id && (
                    <span className="text-muted-foreground text-[11px]">
                      {t('members.you')}
                    </span>
                  )}
                </span>
                <Badge variant={roleTone(m.role)}>{tp(`roles.${m.role}`)}</Badge>
                {canManage && me?.user_id !== m.user_id && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setRemoveTarget(m)}
                    aria-label={t('members.removeTitle')}
                  >
                    <Trash2 className="text-destructive size-4" />
                  </Button>
                )}
              </div>
            ))}
          </Card>
        ) : (
          <EmptyState title={t('members.empty')} />
        )}
      </div>

      <InvitePanel
        canInvite={canManage}
        invite={invite}
        invitations={invitations.data ?? []}
        isLoading={invitations.isLoading}
        onRevoke={async (id) => {
          try {
            await revoke.mutateAsync(id)
            toast.success(t('inbox.cancelled'))
          } catch (e) {
            toastError(e)
          }
        }}
        revoking={revoke.isPending}
        roleOptions={[...PROJECT_ROLES]}
        defaultRole="contributor"
        roleLabel={(r) => tp(`roles.${r}`)}
      />

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(o) => !o && setRemoveTarget(null)}
        title={t('members.removeTitle')}
        description={t('members.removeDesc')}
        destructive
        loading={remove.isPending}
        onConfirm={onRemove}
      />
    </div>
  )
}
