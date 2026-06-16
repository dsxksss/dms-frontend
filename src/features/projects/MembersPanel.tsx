import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { shortId } from '@/lib/format'
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
        <h2 className="font-medium">{t('members.title')}</h2>
        {members.isLoading ? (
          <TableSkeleton rows={3} cols={2} />
        ) : members.isError ? (
          <ErrorState error={members.error} onRetry={() => members.refetch()} />
        ) : members.data && members.data.length > 0 ? (
          <ul className="divide-y rounded-md border">
            {members.data.map((m) => (
              <li
                key={m.user_id}
                className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
              >
                <span className="flex items-center gap-2">
                  <span className="font-mono text-xs">{shortId(m.user_id)}</span>
                  {me?.user_id === m.user_id && (
                    <span className="text-muted-foreground text-xs">
                      {t('members.you')}
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-2">
                  <Badge variant="secondary">{tp(`roles.${m.role}`)}</Badge>
                  {canManage && me?.user_id !== m.user_id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => setRemoveTarget(m)}
                    >
                      <Trash2 className="text-destructive size-4" />
                    </Button>
                  )}
                </span>
              </li>
            ))}
          </ul>
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
