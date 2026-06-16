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

          <div className="space-y-2 rounded-lg border p-3">
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
          </div>

          {grants.isLoading ? (
            <TableSkeleton rows={2} cols={1} />
          ) : grants.data && grants.data.length > 0 ? (
            <ul className="divide-y rounded-md border">
              {grants.data.map((g) => (
                <li
                  key={g.id}
                  className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                >
                  <UserName id={g.user_id} />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => onRevoke(g.user_id)}
                  >
                    <Trash2 className="text-destructive size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">{t('grants.empty')}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
