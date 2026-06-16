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
import { Input } from '@/components/ui/input'
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
import { shortId } from '@/lib/format'
import type { EntityType } from '@/api/registry'

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
  const [userId, setUserId] = useState('')
  const [err, setErr] = useState<{ field?: string; user?: string }>({})

  const onGrant = async () => {
    const e: typeof err = {}
    if (!field) e.field = t('grants.fieldRequired')
    if (!userId.trim()) e.user = t('grants.userRequired')
    setErr(e)
    if (Object.keys(e).length) return
    try {
      await grant.mutateAsync({ user_id: userId.trim(), field })
      toast.success(t('grants.granted'))
      setUserId('')
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

            <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
              <div className="space-y-1.5">
                <Label>{t('grants.field')}</Label>
                <Select value={field} onValueChange={setField}>
                  <SelectTrigger aria-invalid={!!err.field}>
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
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="guser">{t('grants.user')}</Label>
                <Input
                  id="guser"
                  placeholder={t('grants.userPlaceholder')}
                  value={userId}
                  aria-invalid={!!err.user}
                  onChange={(e) => setUserId(e.target.value)}
                />
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
                      <span className="font-mono text-xs">
                        {shortId(g.user_id)}
                      </span>
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
