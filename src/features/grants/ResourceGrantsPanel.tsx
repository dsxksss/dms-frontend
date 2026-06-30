import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { UserAvatar } from '@/components/user-avatar'
import { roleTone } from '@/components/tone'
import { useUser } from '@/hooks/use-membership'
import { useMembers } from '@/hooks/use-projects'
import {
  useGrantResource,
  useResourceGrants,
  useRevokeResource,
} from '@/hooks/use-grants'
import { useToastError } from '@/hooks/use-toast-error'
import type { GrantAction, GrantResourceType } from '@/api/grants'
import type { ProjectRole } from '@/lib/roles'

/** 矩阵列 = 增删改查（4 个 CRUD 动作；不含 `manage`，那不是 CRUD）。 */
const CRUD: GrantAction[] = ['read', 'create', 'update', 'delete']

/**
 * 某项目角色**已由角色本身覆盖**的 CRUD 动作（用于把这些格子锁为「来自角色」、不可在此撤销）：
 * - `viewer` 仅 `read`；`contributor`/`manager`/`owner` 已具备记录的全部 CRUD（与 registry 强制阈值一致）。
 * 没有角色的用户不会出现在矩阵中；后端也不接受非项目成员授权。
 */
function roleImpliedActions(role?: ProjectRole): Set<GrantAction> {
  if (!role) return new Set()
  if (role === 'viewer') return new Set<GrantAction>(['read'])
  return new Set<GrantAction>(['read', 'create', 'update', 'delete'])
}

/**
 * 资源级细粒度授权矩阵：自动列出**项目成员**，每人一行、按 增/查/改/删 勾选放行
 * （在其角色之外叠加；勾=授权、取消=撤销）。仅项目 Manager 可设置（后端兜底）。
 */
export function ResourceGrantsPanel({
  resourceType,
  resourceId,
  projectId,
}: {
  resourceType: GrantResourceType
  resourceId: string
  projectId: string
}) {
  const { t } = useTranslation(['common', 'projects'])
  const grants = useResourceGrants(resourceType, resourceId)
  const members = useMembers(projectId)
  const grant = useGrantResource(resourceType, resourceId)
  const revoke = useRevokeResource(resourceType, resourceId)
  const toastError = useToastError()
  const [busy, setBusy] = useState<Set<string>>(new Set())

  // userId → 已授动作集合。
  const byUser = useMemo(() => {
    const m = new Map<string, Set<GrantAction>>()
    for (const g of grants.data ?? []) {
      const s = m.get(g.user_id) ?? new Set<GrantAction>()
      s.add(g.action)
      m.set(g.user_id, s)
    }
    return m
  }, [grants.data])

  const roleOf = useMemo(
    () => new Map((members.data ?? []).map((mm) => [mm.user_id, mm.role])),
    [members.data],
  )

  // 行 = 项目成员。细粒度授权不支持非项目成员，后端也会拒绝这类授权。
  // 角色已覆盖全部 CRUD 的成员（owner/manager/contributor）也显示，只是那些格子锁死（见 GrantMatrixRow），
  // 一眼可见「无需额外授权、也无法误授」；改角色后成员不会再「消失」。
  const rows = useMemo(() => {
    return (members.data ?? []).map((mm) => mm.user_id)
  }, [members.data])

  const toggle = (userId: string, action: GrantAction, checked: boolean) => {
    const k = `${userId}:${action}`
    setBusy((b) => new Set(b).add(k))
    const body = {
      resource_type: resourceType,
      resource_id: resourceId,
      user_id: userId,
      action,
    }
    const p = checked ? grant.mutateAsync(body) : revoke.mutateAsync(body)
    p.then(() =>
      toast.success(
        t(checked ? 'resourceGrants.granted' : 'resourceGrants.revoked'),
      ),
    )
      .catch(toastError)
      .finally(() =>
        setBusy((b) => {
          const n = new Set(b)
          n.delete(k)
          return n
        }),
      )
  }

  return (
    <div className="space-y-3">
      <p className="text-[12.5px] leading-relaxed text-muted-foreground">
        {t('resourceGrants.matrixDesc')}
      </p>

      <div className="overflow-hidden rounded-[12px] border border-divider">
        {/* 表头 */}
        <div className="flex items-center gap-2 border-b border-divider bg-surface-2/40 px-3.5 py-2 text-[11px] font-semibold text-muted-foreground">
          <div className="min-w-0 flex-1">{t('resourceGrants.user')}</div>
          {CRUD.map((a) => (
            <div key={a} className="w-12 shrink-0 text-center">
              {t(`resourceGrants.actions.${a}`)}
            </div>
          ))}
        </div>

        {members.isLoading ? (
          <div className="px-3.5 py-6 text-center text-[12.5px] text-muted-foreground">
            …
          </div>
        ) : rows.length === 0 ? (
          <div className="px-3.5 py-6 text-center text-[12.5px] text-muted-foreground">
            {t('resourceGrants.noMembers')}
          </div>
        ) : (
          rows.map((id) => (
            <GrantMatrixRow
              key={id}
              userId={id}
              role={roleOf.get(id)}
              actions={byUser.get(id) ?? new Set()}
              implied={roleImpliedActions(roleOf.get(id))}
              busy={busy}
              onToggle={toggle}
            />
          ))
        )}
      </div>

    </div>
  )
}

/** 单行：用户 + 角色徽标 + 各 CRUD 勾选框（角色已覆盖的动作锁定为「来自角色」）。 */
function GrantMatrixRow({
  userId,
  role,
  actions,
  implied,
  busy,
  onToggle,
}: {
  userId: string
  role?: ProjectRole
  actions: Set<GrantAction>
  implied: Set<GrantAction>
  busy: Set<string>
  onToggle: (userId: string, action: GrantAction, checked: boolean) => void
}) {
  const { t } = useTranslation(['common', 'projects'])
  const user = useUser(userId)
  const name =
    user.data?.display_name || user.data?.email?.split('@')[0] || userId.slice(0, 8)

  return (
    <div className="flex items-center gap-2 border-b border-divider px-3.5 py-2 last:border-b-0">
      <UserAvatar name={name} seed={userId} size={28} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[13px] font-semibold">{name}</span>
          {role && (
            <Badge variant={roleTone(role)} className="shrink-0">
              {t(`projects:roles.${role}`)}
            </Badge>
          )}
        </div>
        {user.data?.email && (
          <div className="truncate text-[11px] text-muted-foreground">
            {user.data.email}
          </div>
        )}
      </div>
      {CRUD.map((a) => {
        const fromRole = implied.has(a)
        return (
          <div key={a} className="flex w-12 shrink-0 justify-center">
            <Checkbox
              // 角色已覆盖 → 锁定为已勾（不可在此撤销）；否则按 grant 勾选可叠加放行。
              checked={fromRole || actions.has(a)}
              disabled={fromRole || busy.has(`${userId}:${a}`)}
              title={fromRole ? t('resourceGrants.fromRole') : undefined}
              onCheckedChange={(c) => onToggle(userId, a, c === true)}
            />
          </div>
        )
      })}
    </div>
  )
}
