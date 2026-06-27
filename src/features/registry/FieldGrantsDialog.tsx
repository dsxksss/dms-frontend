import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Search, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EmptyState } from '@/components/states'
import { UserAvatar } from '@/components/user-avatar'
import { useFieldGrants, useGrantField, useRevokeField } from '@/hooks/use-registry'
import { useUserSearch } from '@/hooks/use-membership'
import { useDebounce } from '@/hooks/use-debounce'
import { useToastError } from '@/hooks/use-toast-error'
import { shortId } from '@/lib/format'
import type { EntityType } from '@/api/registry'

/** 敏感字段授权：把某敏感字段单独授权给指定用户可见。 */
export function FieldGrantsDialog({
  projectId,
  type,
  open,
  onOpenChange,
}: {
  projectId: string
  type: EntityType
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation('registry')
  const sensitive = type.fields.filter((f) => f.sensitive)
  const grants = useFieldGrants(projectId, type.kind, type.id)
  const grant = useGrantField(projectId, type.kind, type.id)
  const revoke = useRevokeField(projectId, type.kind, type.id)
  const toastError = useToastError()
  const [field, setField] = useState(sensitive[0]?.name ?? '')
  const [search, setSearch] = useState('')
  const debounced = useDebounce(search, 300)
  const results = useUserSearch(debounced)

  const doGrant = (userId: string) =>
    grant
      .mutateAsync({ user_id: userId, field })
      .then(() => {
        toast.success(t('grants.granted'))
        setSearch('')
      })
      .catch(toastError)

  const doRevoke = (userId: string, f: string) =>
    revoke
      .mutateAsync({ userId, field: f })
      .then(() => toast.success(t('grants.revoked')))
      .catch(toastError)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t('grants.title')}</DialogTitle>
          <DialogDescription>{t('grants.desc')}</DialogDescription>
        </DialogHeader>

        {sensitive.length === 0 ? (
          <EmptyState title={t('grants.noSensitive')} />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Select value={field} onValueChange={setField}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sensitive.map((f) => (
                    <SelectItem key={f.name} value={f.name}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative flex-1">
                <Search className="absolute top-2.5 left-3 size-[15px] text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder={t('grants.user')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {debounced && (
              <div className="max-h-40 overflow-auto rounded-[9px] border">
                {(results.data ?? []).map((u) => (
                  <button
                    type="button"
                    key={u.id}
                    onClick={() => doGrant(u.id)}
                    className="flex w-full items-center gap-2.5 px-2.5 py-2 text-left hover:bg-surface-2"
                  >
                    <UserAvatar name={u.display_name || u.email} seed={u.id} size={26} />
                    <span className="flex-1 truncate text-[12.5px]">
                      {u.display_name || u.email}
                    </span>
                    <span className="text-[11px] font-semibold text-brand">
                      {t('grants.grant')}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div>
              <div className="mb-2 text-[12px] font-bold text-muted-foreground">
                {t('grants.title')}
              </div>
              {(grants.data ?? []).length === 0 ? (
                <p className="text-[12.5px] text-muted-foreground">
                  {t('grants.empty')}
                </p>
              ) : (
                <div className="space-y-1.5">
                  {(grants.data ?? []).map((g) => (
                    <div
                      key={g.id}
                      className="flex items-center gap-2.5 rounded-[9px] border px-2.5 py-1.5"
                    >
                      <UserAvatar name={g.user_id} seed={g.user_id} size={24} />
                      <span className="flex-1 truncate text-[12.5px]">
                        {shortId(g.user_id)} ·{' '}
                        <span className="mono text-brand">{g.field}</span>
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => doRevoke(g.user_id, g.field)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
