import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Share2, UserPlus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PageHeader } from '@/components/page-header'
import { GridHeader, GridRow, TableCard, Th } from '@/components/data-grid'
import { EmptyState, ErrorState, TableSkeleton } from '@/components/states'
import { UserAvatar } from '@/components/user-avatar'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { roleTone } from '@/components/tone'
import { useAuth } from '@/auth/auth-context'
import { useMembers, useProjectRole, useRemoveMember } from '@/hooks/use-projects'
import { useUser } from '@/hooks/use-membership'
import { useToastError } from '@/hooks/use-toast-error'
import { roleAtLeast } from '@/lib/roles'
import type { Member } from '@/api/projects'
import { InvitePanel } from '@/features/membership/InvitePanel'
import { SharesPanel } from './SharesPanel'

const COLS = '1.6fr 1fr 160px 90px'

/** 成员与权限：原型成员表（角色为只读 Badge——后端无「直接改成员角色」端点）+ 邀请 + 跨组织共享。 */
export function MembersPanel({ projectId }: { projectId: string }) {
  const { t } = useTranslation('projects')
  const { me } = useAuth()
  const members = useMembers(projectId)
  const myRole = useProjectRole(projectId)
  const canManage = roleAtLeast(myRole, 'manager')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [sharesOpen, setSharesOpen] = useState(false)

  const data = members.data ?? []
  const ownerCount = data.filter((m) => m.role === 'owner').length

  const actions = canManage && (
    <>
      <Button variant="outline" onClick={() => setSharesOpen(true)}>
        <Share2 className="size-4" />
        {t('shares.title')}
      </Button>
      <Button onClick={() => setInviteOpen(true)}>
        <UserPlus className="size-4" />
        {t('members.add')}
      </Button>
    </>
  )

  return (
    <div className="px-[26px] py-[22px] max-w-[1100px]">
      <PageHeader
        title={t('members.title')}
        titleEn="Members"
        description={t('subtitle')}
        actions={actions}
      />

      {members.isLoading ? (
        <TableSkeleton rows={5} />
      ) : members.isError ? (
        <ErrorState error={members.error} onRetry={() => members.refetch()} />
      ) : data.length === 0 ? (
        <EmptyState title={t('members.empty')} />
      ) : (
        <TableCard>
          <GridHeader cols={COLS}>
            <Th>{t('members.title')}</Th>
            <Th>Email</Th>
            <Th>{t('members.role')}</Th>
            <Th />
          </GridHeader>
          {data.map((m) => (
            <MemberRow
              key={m.user_id}
              member={m}
              isMe={m.user_id === me?.user_id}
              canManage={canManage}
              isLastOwner={m.role === 'owner' && ownerCount <= 1}
              projectId={projectId}
            />
          ))}
        </TableCard>
      )}

      <InvitePanel
        projectId={projectId}
        open={inviteOpen}
        onOpenChange={setInviteOpen}
      />

      <Dialog open={sharesOpen} onOpenChange={setSharesOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{t('shares.title')}</DialogTitle>
          </DialogHeader>
          <SharesPanel projectId={projectId} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function MemberRow({
  member,
  isMe,
  canManage,
  isLastOwner,
  projectId,
}: {
  member: Member
  isMe: boolean
  canManage: boolean
  isLastOwner: boolean
  projectId: string
}) {
  const { t } = useTranslation('projects')
  const remove = useRemoveMember(projectId)
  const toastError = useToastError()
  const user = useUser(member.user_id)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const name =
    user.data?.display_name ||
    user.data?.email?.split('@')[0] ||
    member.user_id.slice(0, 8)

  const doRemove = () =>
    remove
      .mutateAsync(member.user_id)
      .then(() => {
        toast.success(t('members.removed'))
        setConfirmOpen(false)
      })
      .catch(toastError)

  return (
    <GridRow cols={COLS}>
      <div className="flex min-w-0 items-center gap-2.5">
        <UserAvatar name={name} seed={member.user_id} size={30} />
        <span className="min-w-0 truncate font-bold">
          {name}
          {isMe && (
            <span className="ml-1 text-[11px] font-medium text-muted-foreground">
              {t('members.you')}
            </span>
          )}
        </span>
      </div>
      <span className="truncate text-[12px] text-muted-foreground">
        {user.data?.email ?? '—'}
      </span>
      <div>
        <Badge variant={roleTone(member.role)}>
          {t(`roles.${member.role}`)}
        </Badge>
      </div>
      <div>
        {canManage && !isLastOwner && (
          <button
            type="button"
            className="text-[12.5px] font-semibold text-destructive hover:underline"
            onClick={() => setConfirmOpen(true)}
          >
            {t('members.remove')}
          </button>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t('members.removeTitle')}
        description={t('members.removeDescription')}
        destructive
        confirmText={t('members.remove')}
        loading={remove.isPending}
        onConfirm={doRemove}
      />
    </GridRow>
  )
}
