import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Check, Plus, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EmptyState } from '@/components/states'
import { UserAvatar } from '@/components/user-avatar'
import { useDebounce } from '@/hooks/use-debounce'
import { useUser, useUserSearch } from '@/hooks/use-membership'
import {
  useFileGrants,
  useGrantFile,
  useRevokeFile,
} from '@/hooks/use-files'
import { useToastError } from '@/hooks/use-toast-error'
import type { FileGrant } from '@/api/files'

/**
 * 保密文件授权弹窗（Manager 限定）：列出已授权用户（可撤销）+ 搜索用户授权。
 * 仅在 open 时拉取 grants，避免列表展开时的 N+1。
 */
export function FileGrantsDialog({
  projectId,
  fileId,
  open,
  onOpenChange,
}: {
  projectId: string
  fileId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation('files')
  const grants = useFileGrants(projectId, fileId, open)
  const grant = useGrantFile(projectId, fileId)
  const revoke = useRevokeFile(projectId, fileId)
  const toastError = useToastError()
  const rows = grants.data ?? []

  const doGrant = (userId: string) =>
    grant
      .mutateAsync(userId)
      .then(() => toast.success(t('grants.granted')))
      .catch(toastError)

  const doRevoke = (userId: string) =>
    revoke
      .mutateAsync(userId)
      .then(() => toast.success(t('grants.revoked')))
      .catch(toastError)

  const grantedIds = new Set(rows.map((g) => g.user_id))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t('grants.title')}</DialogTitle>
          <DialogDescription>{t('grants.desc')}</DialogDescription>
        </DialogHeader>

        {rows.length === 0 ? (
          <EmptyState title={t('grants.empty')} />
        ) : (
          <div className="overflow-hidden rounded-[12px] border border-divider">
            {rows.map((g) => (
              <GrantedRow
                key={g.id}
                grant={g}
                loading={revoke.isPending}
                onRevoke={() => doRevoke(g.user_id)}
              />
            ))}
          </div>
        )}

        <GrantSearch
          grantedIds={grantedIds}
          pending={grant.isPending}
          onGrant={doGrant}
        />
      </DialogContent>
    </Dialog>
  )
}

function GrantedRow({
  grant,
  loading,
  onRevoke,
}: {
  grant: FileGrant
  loading: boolean
  onRevoke: () => void
}) {
  const user = useUser(grant.user_id)
  const name =
    user.data?.display_name || user.data?.email || grant.user_id.slice(0, 8)
  return (
    <div className="flex items-center gap-2.5 border-b border-divider px-3 py-2.5 last:border-b-0">
      <UserAvatar name={name} seed={grant.user_id} size={28} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold">{name}</div>
        {user.data?.email && (
          <div className="truncate text-[11px] text-muted-foreground">
            {user.data.email}
          </div>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={loading}
        onClick={onRevoke}
      >
        <X className="size-4 text-destructive" />
      </Button>
    </div>
  )
}

/** 搜索用户 → 点 + 授权（已授权者标灰）。 */
function GrantSearch({
  grantedIds,
  pending,
  onGrant,
}: {
  grantedIds: Set<string>
  pending: boolean
  onGrant: (userId: string) => void
}) {
  const { t } = useTranslation(['files', 'membership'])
  const [search, setSearch] = useState('')
  const debounced = useDebounce(search, 300)
  const results = useUserSearch(debounced)
  const rows = results.data ?? []

  return (
    <div className="space-y-2 border-t border-divider pt-3">
      <p className="th">{t('grants.manage')}</p>
      <div className="relative">
        <Search className="absolute top-2.5 left-3 size-[15px] text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder={t('membership:userPicker.placeholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="max-h-[200px] overflow-auto">
        {rows.map((u) => {
          const already = grantedIds.has(u.id)
          return (
            <div
              key={u.id}
              className="flex items-center gap-2.5 rounded-[9px] px-1.5 py-2"
            >
              <UserAvatar
                name={u.display_name || u.email}
                seed={u.id}
                size={28}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold">
                  {u.display_name || u.email.split('@')[0]}
                </div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {u.email}
                </div>
              </div>
              {already ? (
                <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#15803D]">
                  <Check className="size-3.5" />
                  {t('grants.granted')}
                </span>
              ) : (
                <Button
                  variant="outline"
                  size="icon-sm"
                  disabled={pending}
                  onClick={() => onGrant(u.id)}
                >
                  <Plus className="size-4" />
                </Button>
              )}
            </div>
          )
        })}
        {rows.length === 0 && debounced.trim() && (
          <p className="py-6 text-center text-[12.5px] text-muted-foreground">
            {t('membership:userPicker.empty')}
          </p>
        )}
      </div>
    </div>
  )
}
