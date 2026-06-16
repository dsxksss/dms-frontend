import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Send, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TableSkeleton } from '@/components/states'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useToastError } from '@/hooks/use-toast-error'
import { shortId } from '@/lib/format'
import type { Invitation, UserCard } from '@/api/membership'
import { UserPicker } from './UserPicker'

interface InviteMutation {
  mutateAsync: (body: {
    user_ids: string[]
    role?: string
    message?: string
  }) => Promise<{ created: unknown[]; skipped: { user_id: string; reason: string }[] }>
  isPending: boolean
}

export function InvitePanel({
  canInvite,
  invite,
  invitations,
  isLoading,
  onRevoke,
  revoking,
  roleOptions,
  defaultRole,
  roleLabel,
}: {
  canInvite: boolean
  invite: InviteMutation
  invitations: Invitation[]
  isLoading: boolean
  onRevoke: (id: string) => Promise<void>
  revoking: boolean
  roleOptions: string[]
  defaultRole: string
  roleLabel: (r: string) => string
}) {
  const { t } = useTranslation('membership')
  const toastError = useToastError()
  const [users, setUsers] = useState<UserCard[]>([])
  const [role, setRole] = useState(defaultRole)
  const [message, setMessage] = useState('')
  const [revokeId, setRevokeId] = useState<string | null>(null)

  const send = async () => {
    if (!users.length) {
      toast.error(t('invite.noUsers'))
      return
    }
    try {
      const res = await invite.mutateAsync({
        user_ids: users.map((u) => u.id),
        role,
        message: message || undefined,
      })
      toast.success(
        t('invite.result', {
          created: res.created.length,
          skipped: res.skipped.length,
        }),
      )
      res.skipped.forEach((s) =>
        toast.message(
          `${shortId(s.user_id)}: ${t(`invite.reason.${s.reason}`, s.reason)}`,
        ),
      )
      setUsers([])
      setMessage('')
    } catch (e) {
      toastError(e)
    }
  }

  return (
    <div className="space-y-4">
      {canInvite && (
        <div className="space-y-3 rounded-lg border p-3">
          <Label>{t('invite.title')}</Label>
          <UserPicker value={users} onChange={setUsers} />
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1.5">
              <Label>{t('invite.role')}</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((r) => (
                    <SelectItem key={r} value={r}>
                      {roleLabel(r)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Textarea
            placeholder={t('invite.messagePlaceholder')}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <Button onClick={send} disabled={invite.isPending}>
            {invite.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            {t('invite.send')}
          </Button>
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-medium">{t('invite.pending')}</h3>
        {isLoading ? (
          <TableSkeleton rows={2} cols={2} />
        ) : invitations.length > 0 ? (
          <ul className="divide-y rounded-md border">
            {invitations.map((inv) => (
              <li
                key={inv.id}
                className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
              >
                <span className="flex items-center gap-2">
                  <span className="font-mono text-xs">
                    {shortId(inv.invitee_user_id)}
                  </span>
                  <Badge variant="secondary">{roleLabel(inv.role)}</Badge>
                  <span className="text-muted-foreground text-xs">{inv.status}</span>
                </span>
                {canInvite && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => setRevokeId(inv.id)}
                  >
                    <Trash2 className="text-destructive size-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">{t('invite.noPending')}</p>
        )}
      </div>

      <ConfirmDialog
        open={!!revokeId}
        onOpenChange={(o) => !o && setRevokeId(null)}
        title={t('invite.revokeTitle')}
        destructive
        loading={revoking}
        onConfirm={async () => {
          if (revokeId) await onRevoke(revokeId)
          setRevokeId(null)
        }}
      />
    </div>
  )
}
