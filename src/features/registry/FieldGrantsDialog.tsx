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
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EmptyState, TableSkeleton } from '@/components/states'
import {
  useFieldGrants,
  useGrantField,
  useRevokeField,
} from '@/hooks/use-registry'
import { useToastError } from '@/hooks/use-toast-error'
import { UserName } from '@/components/user-name'
import type { EntityType } from '@/api/registry'
import type { UserCard } from '@/api/membership'
import { UserPicker } from '@/features/membership/UserPicker'

export function FieldGrantsDialog({
  projectId,
  type,
  open,
  onOpenChange,
}: {
  projectId: string
  type: EntityType
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const { t } = useTranslation('registry')
  const sensitive = type.fields.filter((f) => f.sensitive)
  const grants = useFieldGrants(projectId, type.id)
  const grant = useGrantField(projectId, type.id)
  const revoke = useRevokeField(projectId, type.id)
  const toastError = useToastError()

  const [field, setField] = useState('')
  const [users, setUsers] = useState<UserCard[]>([])
  const [err, setErr] = useState<{ field?: string; user?: string }>({})

  const onGrant = async () => {
    const uid = users[0]?.id
    const e: typeof err = {}
    if (!field) e.field = t('grants.fieldRequired')
    if (!uid) e.user = t('grants.userRequired')
    setErr(e)
    if (Object.keys(e).length) return
    try {
      await grant.mutateAsync({ user_id: uid!, field })
      toast.success(t('grants.granted'))
      setUsers([])
      setField('')
    } catch (ex) {
      toastError(ex)
    }
  }

  const onRevoke = async (uid: string, f: string) => {
    try {
      await revoke.mutateAsync({ userId: uid, field: f })
      toast.success(t('grants.revoked'))
    } catch (ex) {
      toastError(ex)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('grants.title')}</DialogTitle>
        </DialogHeader>

        {sensitive.length === 0 ? (
          <EmptyState title={t('grants.noSensitive')} />
        ) : (
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">{t('grants.desc')}</p>

            <div className="space-y-3 rounded-lg border p-3">
              <div className="space-y-1.5">
                <Label>{t('grants.field')}</Label>
                <Select value={field} onValueChange={setField}>
                  <SelectTrigger aria-invalid={!!err.field} className="w-full">
                    <SelectValue placeholder={t('grants.field')} />
                  </SelectTrigger>
                  <SelectContent>
                    {sensitive.map((f) => (
                      <SelectItem key={f.name} value={f.name}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {err.field && (
                  <p className="text-destructive text-sm">{err.field}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>{t('grants.user')}</Label>
                <UserPicker value={users} onChange={setUsers} max={1} />
                {err.user && <p className="text-destructive text-sm">{err.user}</p>}
              </div>
              <Button onClick={onGrant} disabled={grant.isPending}>
                {grant.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                {t('grants.grant')}
              </Button>
            </div>

            {grants.isLoading ? (
              <TableSkeleton rows={2} cols={2} />
            ) : grants.data && grants.data.length > 0 ? (
              <ul className="divide-y rounded-md border">
                {grants.data.map((g) => (
                  <li
                    key={g.id}
                    className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <Badge variant="secondary">{g.field}</Badge>
                      <UserName id={g.user_id} className="text-sm" />
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => onRevoke(g.user_id, g.field)}
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
        )}
      </DialogContent>
    </Dialog>
  )
}
