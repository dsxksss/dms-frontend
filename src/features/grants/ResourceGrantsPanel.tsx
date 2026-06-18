import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Check, Plus, Search, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EmptyState } from '@/components/states'
import { UserAvatar } from '@/components/user-avatar'
import { cn } from '@/lib/utils'
import { useDebounce } from '@/hooks/use-debounce'
import { useUser, useUserSearch } from '@/hooks/use-membership'
import {
  useGrantResource,
  useResourceGrants,
  useRevokeResource,
} from '@/hooks/use-grants'
import { useToastError } from '@/hooks/use-toast-error'
import {
  GRANT_ACTIONS,
  type GrantAction,
  type GrantResourceType,
} from '@/api/grants'

/**
 * 资源级细粒度授权面板：按用户聚合展示其 action 徽标 + 单独撤销；
 * 下方搜索用户 + 选 action 新增授权。仅项目 Manager 可设置（后端兜底鉴权）。
 */
export function ResourceGrantsPanel({
  resourceType,
  resourceId,
}: {
  resourceType: GrantResourceType
  resourceId: string
}) {
  const { t } = useTranslation('common')
  const grants = useResourceGrants(resourceType, resourceId)
  const grant = useGrantResource(resourceType, resourceId)
  const revoke = useRevokeResource(resourceType, resourceId)
  const toastError = useToastError()

  const [pickedUser, setPickedUser] = useState<string | null>(null)
  const [action, setAction] = useState<GrantAction>('read')

  // 按用户聚合：user_id → 已授 action 集合。
  const byUser = useMemo(() => {
    const map = new Map<string, GrantAction[]>()
    for (const g of grants.data ?? []) {
      const list = map.get(g.user_id) ?? []
      list.push(g.action)
      map.set(g.user_id, list)
    }
    return [...map.entries()]
  }, [grants.data])

  const doGrant = () => {
    if (!pickedUser) return
    grant
      .mutateAsync({
        resource_type: resourceType,
        resource_id: resourceId,
        user_id: pickedUser,
        action,
      })
      .then(() => {
        toast.success(t('resourceGrants.granted'))
        setPickedUser(null)
        setAction('read')
      })
      .catch(toastError)
  }

  const doRevoke = (g: { user_id: string; action: GrantAction }) =>
    revoke
      .mutateAsync({
        resource_type: resourceType,
        resource_id: resourceId,
        user_id: g.user_id,
        action: g.action,
      })
      .then(() => toast.success(t('resourceGrants.revoked')))
      .catch(toastError)

  return (
    <div className="space-y-3">
      <p className="text-[12.5px] leading-relaxed text-muted-foreground">
        {t('resourceGrants.desc')}
      </p>

      {byUser.length === 0 ? (
        <EmptyState title={t('resourceGrants.empty')} />
      ) : (
        <div className="overflow-hidden rounded-[12px] border border-divider">
          {byUser.map(([userId, actions]) => (
            <GrantUserRow
              key={userId}
              userId={userId}
              actions={actions}
              onRevoke={(a) => doRevoke({ user_id: userId, action: a })}
            />
          ))}
        </div>
      )}

      <div className="rounded-[12px] border border-divider bg-surface-2/40 p-3">
        <p className="th mb-2">{t('resourceGrants.add')}</p>
        <GrantUserSearch picked={pickedUser} onPick={setPickedUser} />
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Label className="text-[12.5px]">{t('resourceGrants.action')}</Label>
            <Select
              value={action}
              onValueChange={(v) => setAction(v as GrantAction)}
            >
              <SelectTrigger className="h-8 w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GRANT_ACTIONS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {t(`resourceGrants.actions.${a}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={doGrant} disabled={!pickedUser || grant.isPending}>
            <Plus className="size-4" />
            {t('resourceGrants.add')}
          </Button>
        </div>
      </div>
    </div>
  )
}

/** 单个用户的授权行：头像 + 名 + 各 action 徽标（点 × 撤销）。 */
function GrantUserRow({
  userId,
  actions,
  onRevoke,
}: {
  userId: string
  actions: GrantAction[]
  onRevoke: (action: GrantAction) => void
}) {
  const { t } = useTranslation('common')
  const user = useUser(userId)
  const name =
    user.data?.display_name || user.data?.email || userId.slice(0, 8)

  return (
    <div className="flex items-center gap-3 border-b border-divider px-3.5 py-2.5 last:border-b-0">
      <UserAvatar name={name} seed={userId} size={28} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold">{name}</div>
        {user.data?.email && (
          <div className="truncate text-[11px] text-muted-foreground">
            {user.data.email}
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        {actions.map((a) => (
          <button
            key={a}
            type="button"
            title={t('resourceGrants.revoked')}
            onClick={() => onRevoke(a)}
            className="group inline-flex items-center gap-1"
          >
            <Badge variant="info" className="group-hover:opacity-70">
              {t(`resourceGrants.actions.${a}`)}
              <X className="size-3" />
            </Badge>
          </button>
        ))}
      </div>
    </div>
  )
}

/** 行内单选用户搜索（授权对象）。选中后回显一行，可清除重选。 */
function GrantUserSearch({
  picked,
  onPick,
}: {
  picked: string | null
  onPick: (id: string | null) => void
}) {
  const { t } = useTranslation(['common', 'membership'])
  const [search, setSearch] = useState('')
  const debounced = useDebounce(search, 300)
  const results = useUserSearch(debounced)
  const pickedUser = useUser(picked)
  const rows = results.data ?? []

  if (picked) {
    const name =
      pickedUser.data?.display_name ||
      pickedUser.data?.email ||
      picked.slice(0, 8)
    return (
      <div className="flex items-center gap-2.5 rounded-[9px] border border-divider px-2.5 py-2">
        <UserAvatar name={name} seed={picked} size={28} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold">{name}</div>
          {pickedUser.data?.email && (
            <div className="truncate text-[11px] text-muted-foreground">
              {pickedUser.data.email}
            </div>
          )}
        </div>
        <Button variant="ghost" size="icon-sm" onClick={() => onPick(null)}>
          <X className="size-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute top-2.5 left-3 size-[15px] text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder={t('membership:userPicker.placeholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {rows.length > 0 && (
        <div className="max-h-[180px] overflow-auto rounded-[9px] border border-divider">
          {rows.map((u) => (
            <button
              type="button"
              key={u.id}
              onClick={() => {
                onPick(u.id)
                setSearch('')
              }}
              className={cn(
                'flex w-full items-center gap-2.5 border-b border-divider px-2.5 py-2 text-left last:border-b-0 hover:bg-surface-2',
              )}
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
              <Check className="size-4 text-muted-foreground opacity-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
