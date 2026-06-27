import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { UserAvatar } from '@/components/user-avatar'
import { useToastError } from '@/hooks/use-toast-error'
import {
  useInviteToProject,
  useProjectInvitations,
  useRevokeInvitation,
  useUser,
} from '@/hooks/use-membership'
import { useMembers } from '@/hooks/use-projects'
import type { Invitation } from '@/api/membership'
import { UserPicker } from './UserPicker'

const INVITE_ROLES = ['viewer', 'contributor', 'manager'] as const

/** 角色 → 其授予的增删改查（与「权限」那套 resourceGrants.actions 对齐）。 */
const ROLE_CRUD: Record<(typeof INVITE_ROLES)[number], string[]> = {
  viewer: ['read'],
  contributor: ['read', 'create', 'update'],
  manager: ['read', 'create', 'update', 'delete', 'manage'],
}

/** 邀请成员弹窗：UserPicker 多选 + 角色 + 可选附言 → 批量邀请；下方列出待处理邀请并可撤销。 */
export function InvitePanel({
  projectId,
  open,
  onOpenChange,
}: {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation(['membership', 'projects', 'common'])
  const [selected, setSelected] = useState<string[]>([])
  const [role, setRole] = useState<string>('viewer')
  const [message, setMessage] = useState('')
  const invite = useInviteToProject(projectId)
  const members = useMembers(projectId)
  // 已是项目成员的人不应再被邀请 → 在 picker 里灰显「已是成员」。
  const memberIds = useMemo(
    () => new Set((members.data ?? []).map((m) => m.user_id)),
    [members.data],
  )
  const toastError = useToastError()

  const reset = () => {
    setSelected([])
    setRole('viewer')
    setMessage('')
  }

  const send = () => {
    if (selected.length === 0) return
    invite
      .mutateAsync({
        user_ids: selected,
        role,
        message: message.trim() || undefined,
      })
      .then((res) => {
        toast.success(
          t('invite.result', {
            created: res.created.length,
            skipped: res.skipped.length,
          }),
        )
        reset()
        onOpenChange(false)
      })
      .catch(toastError)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset()
        onOpenChange(o)
      }}
    >
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('invite.title')}</DialogTitle>
        </DialogHeader>

        <UserPicker
          selected={selected}
          onChange={setSelected}
          disabledIds={memberIds}
          disabledLabel={t('invite.alreadyMember')}
        />

        <div className="space-y-1.5">
          <Label className="text-[12.5px]">{t('invite.message')}</Label>
          <Textarea
            className="min-h-[60px] text-[13px]"
            placeholder={t('invite.messagePlaceholder')}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        <DialogFooter className="items-center gap-2 sm:justify-between">
          <div className="flex items-center gap-2">
            <Label className="text-[12.5px]">{t('invite.role')}</Label>
            <Select value={role} onValueChange={setRole}>
              {/* 触发器只显示角色名（紧凑）；下拉项展开为「角色名 · 查看·新增·改…」与权限模型对齐。 */}
              <SelectTrigger className="h-8 w-28">
                {t(`projects:roles.${role}`)}
              </SelectTrigger>
              <SelectContent>
                {INVITE_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    <span className="font-medium">{t(`projects:roles.${r}`)}</span>
                    <span className="ml-1.5 text-[11px] text-muted-foreground">
                      {ROLE_CRUD[r]
                        .map((a) => t(`resourceGrants.actions.${a}`, { ns: 'common' }))
                        .join(' · ')}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={send}
            disabled={selected.length === 0 || invite.isPending}
          >
            {invite.isPending && <Loader2 className="size-4 animate-spin" />}
            {t('invite.send')} ({selected.length})
          </Button>
        </DialogFooter>

        <PendingInvitations projectId={projectId} />
      </DialogContent>
    </Dialog>
  )
}

/** 待处理邀请列表（可撤销）。 */
function PendingInvitations({ projectId }: { projectId: string }) {
  const { t } = useTranslation('membership')
  const invitations = useProjectInvitations(projectId)
  const revoke = useRevokeInvitation()
  const toastError = useToastError()
  const rows = invitations.data ?? []

  return (
    <div className="mt-1 border-t border-divider pt-3">
      <p className="th mb-2">{t('invite.pending')}</p>
      {rows.length === 0 ? (
        <p className="py-3 text-center text-[12.5px] text-muted-foreground">
          {t('invite.noPending')}
        </p>
      ) : (
        <div className="max-h-[160px] space-y-0.5 overflow-auto">
          {rows.map((inv) => (
            <InvitationRow
              key={inv.id}
              invitation={inv}
              loading={revoke.isPending}
              onRevoke={() =>
                revoke
                  .mutateAsync(inv.id)
                  .then(() => toast.success(t('inbox.cancelled')))
                  .catch(toastError)
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}

function InvitationRow({
  invitation,
  loading,
  onRevoke,
}: {
  invitation: Invitation
  loading: boolean
  onRevoke: () => void
}) {
  const { t } = useTranslation('membership')
  const user = useUser(invitation.invitee_user_id)
  const name =
    user.data?.display_name ||
    user.data?.email ||
    invitation.invitee_user_id.slice(0, 8)

  return (
    <div className="flex items-center gap-2.5 rounded-[9px] px-1.5 py-1.5">
      <UserAvatar name={name} seed={invitation.invitee_user_id} size={28} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12.5px] font-semibold">{name}</div>
        {user.data?.email && (
          <div className="truncate text-[11px] text-muted-foreground">
            {user.data.email}
          </div>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        title={t('invite.revoke')}
        disabled={loading}
        onClick={onRevoke}
      >
        <X className="size-4 text-destructive" />
      </Button>
    </div>
  )
}
