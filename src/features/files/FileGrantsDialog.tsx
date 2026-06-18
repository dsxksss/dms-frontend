import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { RowList, Row } from '@/components/row-list'
import { UserAvatar } from '@/components/user-avatar'
import { TableSkeleton } from '@/components/states'
import { UserName } from '@/components/user-name'
import { UserPicker } from '@/features/membership/UserPicker'
import {
  useFileGrants,
  useGrantFile,
  useRevokeFile,
} from '@/hooks/use-files'
import { useToastError } from '@/hooks/use-toast-error'
import type { FileItem } from '@/api/files'
import type { UserCard } from '@/api/membership'

export function FileGrantsDialog({
  projectId,
  file,
  open,
  onOpenChange,
}: {
  projectId: string
  file: FileItem
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const { t } = useTranslation('files')
  const grants = useFileGrants(projectId, file.id, open)
  const grant = useGrantFile(projectId, file.id)
  const revoke = useRevokeFile(projectId, file.id)
  const toastError = useToastError()
  const [users, setUsers] = useState<UserCard[]>([])

  const onGrant = async () => {
    const uid = users[0]?.id
    if (!uid) return
    try {
      await grant.mutateAsync(uid)
      toast.success(t('grants.granted'))
      setUsers([])
    } catch (e) {
      toastError(e)
    }
  }

  const onRevoke = async (uid: string) => {
    try {
      await revoke.mutateAsync(uid)
      toast.success(t('grants.revoked'))
    } catch (e) {
      toastError(e)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t('grants.title')} · {file.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">{t('grants.desc')}</p>

          <Card className="gap-2 p-4">
            <Label>{t('grants.title')}</Label>
            <UserPicker value={users} onChange={setUsers} max={1} />
            <Button onClick={onGrant} disabled={!users[0] || grant.isPending}>
              {grant.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              {t('grants.manage')}
            </Button>
          </Card>

          {grants.isLoading ? (
            <TableSkeleton rows={2} cols={1} />
          ) : grants.data && grants.data.length > 0 ? (
            <RowList>
              {grants.data.map((g) => (
                <Row key={g.id}>
                  <UserAvatar seed={g.user_id} />
                  <span className="min-w-0 flex-1">
                    <UserName
                      id={g.user_id}
                      className="truncate text-[13px] font-semibold"
                    />
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onRevoke(g.user_id)}
                    aria-label={t('grants.revoked')}
                  >
                    <Trash2 className="text-destructive size-4" />
                  </Button>
                </Row>
              ))}
            </RowList>
          ) : (
            <p className="text-muted-foreground text-sm">{t('grants.empty')}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
