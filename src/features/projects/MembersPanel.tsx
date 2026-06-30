import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  Archive,
  ArchiveRestore,
  Boxes,
  FlaskConical,
  Globe,
  Lock,
  Ruler,
  Save,
  ShieldCheck,
  UserPlus,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/page-header'
import { GridHeader, GridRow, TableCard, Th } from '@/components/data-grid'
import { EmptyState, ErrorState, TableSkeleton } from '@/components/states'
import { UserAvatar } from '@/components/user-avatar'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { RoleSelect } from '@/components/role-select'
import { roleTone } from '@/components/tone'
import { useAuth } from '@/auth/auth-context'
import { useEntityTypes } from '@/hooks/use-registry'
import { ResourceGrantsDialog } from '@/features/grants/ResourceGrantsDialog'
import type { EntityType } from '@/api/registry'
import {
  useAddShare,
  useApproveProjectJoinRequest,
  useMembers,
  useProject,
  useProjectJoinRequests,
  useProjectRole,
  useRejectProjectJoinRequest,
  useRemoveMember,
  useRemoveShare,
  useSetArchived,
  useSetMemberRole,
  useShares,
  useUpdateProject,
} from '@/hooks/use-projects'
import { useUser } from '@/hooks/use-membership'
import { useToastError } from '@/hooks/use-toast-error'
import {
  useCreateUnit,
  useDeleteUnit,
  useUnits,
  useUpdateUnit,
} from '@/hooks/use-units'
import { roleAtLeast } from '@/lib/roles'
import type { Member } from '@/api/projects'
import type { Unit, UnitInput } from '@/api/units'
import { InvitePanel } from '@/features/membership/InvitePanel'

const COLS = '1.7fr 1fr 150px 110px'

/**
 * 成员与角色：项目成员表（头像/姓名/邮箱/角色 Badge）+ 邀请 + 移除。
 * 访问统一以「项目成员 + 角色」表达——不再叠加「协作者(细粒度授权)」与「跨组织共享」（已下线，避免歧义）。
 */
export function MembersPanel({ projectId }: { projectId: string }) {
  const { t } = useTranslation('projects')
  const { me } = useAuth()
  const members = useMembers(projectId)
  const project = useProject(projectId)
  const myRole = useProjectRole(projectId)
  const canManage = roleAtLeast(myRole, 'manager')
  const toastError = useToastError()
  const [inviteOpen, setInviteOpen] = useState(false)

  // 可见性 = 是否对「项目所属组织」共享（org_id=组织 id，role=viewer）。私有=无此共享。
  const shares = useShares(projectId)
  const addShare = useAddShare(projectId)
  const removeShare = useRemoveShare(projectId)
  const orgId = project.data?.organization_id
  const orgShare = shares.data?.find((s) => s.org_id && s.org_id === orgId)
  const visibility: 'private' | 'org' = orgShare ? 'org' : 'private'
  const setVisibility = (v: 'private' | 'org') => {
    if (v === visibility) return
    const done = () => toast.success(t('visibility.set'))
    if (v === 'org' && orgId) {
      addShare
        .mutateAsync({ org_id: orgId, role: 'viewer' })
        .then(done)
        .catch(toastError)
    } else if (v === 'private' && orgShare) {
      removeShare.mutateAsync(orgShare.id).then(done).catch(toastError)
    }
  }
  const visBusy = addShare.isPending || removeShare.isPending

  const data = members.data ?? []
  const ownerCount = data.filter((m) => m.role === 'owner').length

  return (
    <div className="mx-auto max-w-[1100px] space-y-6 px-[26px] py-[22px]">
      <PageHeader
        title={t('settings.title')}
        titleEn="Settings"
        description={t('settings.subtitle')}
      />

      {canManage && <ProjectBasicsSection projectId={projectId} />}

      {/* 可见性设置（Owner/Manager 可改）：私有 ↔ 组织内公开。 */}
      {canManage && (
        <div className="card-shadow flex items-start justify-between gap-4 rounded-[14px] border bg-card p-5">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[14px] font-bold">
              {visibility === 'org' ? (
                <Globe className="size-4 text-brand" />
              ) : (
                <Lock className="size-4 text-muted-foreground" />
              )}
              {t('visibility.label')}
            </div>
            <p className="mt-1 max-w-[600px] text-[12.5px] leading-relaxed text-muted-foreground">
              {visibility === 'org'
                ? t('visibility.orgDesc')
                : t('visibility.privateDesc')}
            </p>
          </div>
          {/* 分段切换：两个选项始终可见,点哪个就是哪个（比下拉更直观稳妥）。 */}
          <div className="inline-flex shrink-0 rounded-lg border border-divider bg-surface-1 p-0.5">
            {(['private', 'org'] as const).map((v) => {
              const on = visibility === v
              return (
                <button
                  key={v}
                  type="button"
                  disabled={visBusy || shares.isLoading}
                  onClick={() => setVisibility(v)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition disabled:opacity-60',
                    on
                      ? 'bg-card text-brand shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {v === 'org' ? (
                    <Globe className="size-3.5" />
                  ) : (
                    <Lock className="size-3.5" />
                  )}
                  {t(`visibility.${v}`)}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* 申请加入（待审批）——仅 Owner/Manager 可见可操作。 */}
      {canManage && <JoinRequestsSection projectId={projectId} />}

      {/* 成员 */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-bold">{t('members.title')}</h2>
          {canManage && (
            <Button onClick={() => setInviteOpen(true)}>
              <UserPlus className="size-4" />
              {t('members.add')}
            </Button>
          )}
        </div>

        {members.isLoading ? (
          <TableSkeleton rows={5} />
        ) : members.isError ? (
          <ErrorState error={members.error} onRetry={() => members.refetch()} />
        ) : data.length === 0 ? (
          <EmptyState title={t('members.empty')} />
        ) : (
          <TableCard>
            <GridHeader cols={COLS}>
              <Th>{t('members.title')}</Th>
              <Th>Email</Th>
              <Th>{t('members.role')}</Th>
              <Th />
            </GridHeader>
            {data.map((m) => (
              <MemberRow
                key={m.user_id}
                member={m}
                isMe={m.user_id === me?.user_id}
                canManage={canManage}
                isLastOwner={m.role === 'owner' && ownerCount <= 1}
                projectId={projectId}
              />
            ))}
          </TableCard>
        )}
      </div>

      {/* 单位库：项目 Schema 中的数值字段可直接引用。 */}
      {canManage && <UnitCatalogSection projectId={projectId} />}

      {/* 细粒度授权（按内容类型）——角色之外，对单个类型精确授予某成员 增/查/改/删。 */}
      {canManage && <FineGrainedGrantsSection projectId={projectId} />}

      <InvitePanel
        projectId={projectId}
        open={inviteOpen}
        onOpenChange={setInviteOpen}
      />
    </div>
  )
}

function ProjectBasicsSection({ projectId }: { projectId: string }) {
  const { t } = useTranslation('projects')
  const project = useProject(projectId)
  const update = useUpdateProject(projectId)
  const setArchived = useSetArchived()
  const toastError = useToastError()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const current = project.data

  useEffect(() => {
    if (!current) return
    setName(current.name)
    setDescription(current.description ?? '')
  }, [current?.id, current?.name, current?.description])

  const dirty =
    !!current &&
    (name.trim() !== current.name || description.trim() !== (current.description ?? ''))
  const busy = update.isPending || setArchived.isPending

  const save = () => {
    if (!current || !name.trim()) return
    update
      .mutateAsync({
        name: name.trim(),
        description: description.trim(),
        version: current.version,
      })
      .then(() => toast.success(t('toast.updated')))
      .catch(toastError)
  }

  const toggleArchive = () => {
    if (!current) return
    setArchived
      .mutateAsync({ id: current.id, archived: !current.archived })
      .then(() =>
        toast.success(t(current.archived ? 'toast.unarchived' : 'toast.archived')),
      )
      .catch(toastError)
  }

  return (
    <div className="card-shadow space-y-4 rounded-[14px] border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[14px] font-bold">{t('settings.infoTitle')}</div>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            {t('settings.infoSubtitle')}
          </p>
        </div>
        {current?.archived && <Badge variant="neutral">{t('status.archived')}</Badge>}
      </div>
      <div className="grid gap-3 md:grid-cols-[1fr_1.4fr_auto] md:items-end">
        <div className="space-y-1.5">
          <div className="text-[12px] font-medium text-muted-foreground">
            {t('create.name')}
          </div>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('create.namePlaceholder')}
          />
        </div>
        <div className="space-y-1.5">
          <div className="text-[12px] font-medium text-muted-foreground">
            {t('create.description')}
          </div>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('create.descriptionPlaceholder')}
            className="min-h-10 resize-none"
          />
        </div>
        <Button disabled={!dirty || !name.trim() || busy} onClick={save}>
          <Save className="size-4" />
          {t('settings.saveInfo')}
        </Button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-divider pt-4">
        <div>
          <div className="text-[13px] font-semibold">{t('settings.archiveTitle')}</div>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            {t('settings.archiveHint')}
          </p>
        </div>
        <Button variant="outline" disabled={!current || busy} onClick={toggleArchive}>
          {current?.archived ? (
            <ArchiveRestore className="size-4" />
          ) : (
            <Archive className="size-4" />
          )}
          {t(current?.archived ? 'settings.unarchive' : 'settings.archive')}
        </Button>
      </div>
    </div>
  )
}

const UNIT_CATEGORIES = [
  'concentration',
  'amount',
  'mass',
  'volume',
  'time',
  'temperature',
  'activity',
  'molecular_weight',
  'sequence_length',
  'ratio',
  'acidity',
  'speed',
] as const

const emptyUnitDraft = (): UnitInput => ({
  key: '',
  name: '',
  symbol: '',
  category: 'concentration',
  description: '',
})

function UnitCatalogSection({ projectId }: { projectId: string }) {
  const { t } = useTranslation('projects')
  const units = useUnits(projectId)
  const create = useCreateUnit(projectId)
  const update = useUpdateUnit(projectId)
  const remove = useDeleteUnit(projectId)
  const toastError = useToastError()
  const [draft, setDraft] = useState<UnitInput>(emptyUnitDraft)
  const [editing, setEditing] = useState<Unit | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Unit | null>(null)

  const patchDraft = (patch: Partial<UnitInput>) =>
    setDraft((d) => ({ ...d, ...patch }))

  const reset = () => {
    setDraft(emptyUnitDraft())
    setEditing(null)
  }

  const edit = (unit: Unit) => {
    setEditing(unit)
    setDraft({
      key: unit.key,
      name: unit.name,
      symbol: unit.symbol,
      category: unit.category,
      description: unit.description ?? '',
    })
  }

  const save = async () => {
    if (!draft.key.trim() || !draft.name.trim() || !draft.symbol.trim()) return
    try {
      const body = {
        key: draft.key.trim(),
        name: draft.name.trim(),
        symbol: draft.symbol.trim(),
        category: draft.category.trim(),
        description: draft.description?.trim() || null,
      }
      if (editing) {
        await update.mutateAsync({ id: editing.id, body })
        toast.success(t('units.updated'))
      } else {
        await create.mutateAsync(body)
        toast.success(t('units.created'))
      }
      reset()
    } catch (e) {
      toastError(e)
    }
  }

  const doDelete = async () => {
    if (!deleteTarget) return
    try {
      await remove.mutateAsync(deleteTarget.id)
      toast.success(t('units.deleted'))
      if (editing?.id === deleteTarget.id) reset()
      setDeleteTarget(null)
    } catch (e) {
      toastError(e)
    }
  }

  const busy = create.isPending || update.isPending
  const data = units.data ?? []

  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5">
        <Ruler className="size-4 text-brand" />
        <h2 className="text-[15px] font-bold">{t('units.title')}</h2>
      </div>
      <p className="mb-3 max-w-[640px] text-[12.5px] leading-relaxed text-muted-foreground">
        {t('units.subtitle')}
      </p>

      <div className="mb-3 grid gap-2 rounded-[10px] border bg-card p-3 md:grid-cols-[1fr_1fr_110px_150px_auto]">
        <Input
          value={draft.key}
          placeholder={t('units.key')}
          disabled={!!editing}
          onChange={(e) => patchDraft({ key: e.target.value })}
        />
        <Input
          value={draft.name}
          placeholder={t('units.name')}
          onChange={(e) => patchDraft({ name: e.target.value })}
        />
        <Input
          value={draft.symbol}
          placeholder={t('units.symbol')}
          onChange={(e) => patchDraft({ symbol: e.target.value })}
        />
        <Select
          value={draft.category}
          onValueChange={(category) => patchDraft({ category })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {UNIT_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {t(`units.categories.${c}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            disabled={busy || !draft.key.trim() || !draft.name.trim() || !draft.symbol.trim()}
            onClick={save}
          >
            {editing ? t('units.save') : t('units.add')}
          </Button>
          {editing && (
            <Button type="button" size="sm" variant="outline" onClick={reset}>
              {t('units.cancel')}
            </Button>
          )}
        </div>
      </div>

      {units.isLoading ? (
        <TableSkeleton rows={4} />
      ) : units.isError ? (
        <ErrorState error={units.error} onRetry={() => units.refetch()} />
      ) : data.length === 0 ? (
        <EmptyState title={t('units.empty')} />
      ) : (
        <TableCard className="max-h-[320px] overflow-auto">
          {data.map((u) => (
            <div key={u.id} className="flex items-center gap-3 px-4 py-2.5">
              <div className="mono flex h-8 min-w-12 items-center justify-center rounded-[8px] bg-accent px-2 text-[12px] font-bold text-brand">
                {u.symbol}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[13px] font-bold">{u.name}</span>
                  {u.is_builtin && (
                    <Badge variant="info">{t('units.builtin')}</Badge>
                  )}
                </div>
                <div className="truncate text-[11.5px] text-muted-foreground">
                  {t(`units.categories.${u.category}`, { defaultValue: u.category })} · {u.key}
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => edit(u)}>
                {t('units.edit')}
              </Button>
              <button
                type="button"
                className="text-[12.5px] font-semibold text-destructive hover:underline"
                onClick={() => setDeleteTarget(u)}
              >
                {t('units.delete')}
              </button>
            </div>
          ))}
        </TableCard>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('units.deleteTitle')}
        description={t('units.deleteDescription', {
          symbol: deleteTarget?.symbol ?? '',
        })}
        destructive
        confirmText={t('units.delete')}
        loading={remove.isPending}
        onConfirm={doDelete}
      />
    </div>
  )
}

/**
 * 细粒度授权：角色（Owner/Manager/Contributor/Viewer）给的是项目级粗粒度增删改查；
 * 这里可**绕过角色**对单个药物资产类型 / 数据模版，把 增/查/改/删 精确授予某成员
 * （例：某查看者只能对「抗体」类型新增、但不能删）。复用 resource_grants 后端，集中在设置页管理。
 */
function FineGrainedGrantsSection({ projectId }: { projectId: string }) {
  const { t } = useTranslation('projects')
  const types = useEntityTypes(projectId)
  const [target, setTarget] = useState<EntityType | null>(null)
  const all = types.data ?? []

  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5">
        <ShieldCheck className="size-4 text-brand" />
        <h2 className="text-[15px] font-bold">{t('grants.title')}</h2>
      </div>
      <p className="mb-3 max-w-[640px] text-[12.5px] leading-relaxed text-muted-foreground">
        {t('grants.subtitle')}
      </p>

      {types.isLoading ? (
        <TableSkeleton rows={3} />
      ) : all.length === 0 ? (
        <EmptyState title={t('grants.empty')} hint={t('grants.emptyHint')} />
      ) : (
        <TableCard>
          {all.map((ty) => (
            <div
              key={ty.id}
              className="flex items-center gap-3 px-4 py-2.5"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-accent text-brand">
                {ty.kind === 'asset' ? (
                  <Boxes className="size-[18px]" />
                ) : (
                  <FlaskConical className="size-[18px]" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-bold">{ty.name}</div>
                <div className="text-[11.5px] text-muted-foreground">
                  {t(ty.kind === 'asset' ? 'grants.assetType' : 'grants.dataTemplate')}
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => setTarget(ty)}>
                {t('grants.manage')}
              </Button>
            </div>
          ))}
        </TableCard>
      )}

      {target && (
        <ResourceGrantsDialog
          resourceType={target.kind === 'asset' ? 'asset_type' : 'template_type'}
          resourceId={target.id}
          projectId={projectId}
          name={target.name}
          open={!!target}
          onOpenChange={(o) => !o && setTarget(null)}
        />
      )}
    </div>
  )
}

function MemberRow({
  member,
  isMe,
  canManage,
  isLastOwner,
  projectId,
}: {
  member: Member
  isMe: boolean
  canManage: boolean
  isLastOwner: boolean
  projectId: string
}) {
  const { t } = useTranslation(['projects', 'common'])
  const remove = useRemoveMember(projectId)
  const setRole = useSetMemberRole(projectId)
  const toastError = useToastError()
  const user = useUser(member.user_id)
  const [confirmOpen, setConfirmOpen] = useState(false)
  // 拥有者不在此处改角色（属主转让另作他途）；其余成员可由 Manager 调整。
  const canEditRole = canManage && member.role !== 'owner'

  const changeRole = (role: 'viewer' | 'contributor' | 'manager') =>
    setRole
      .mutateAsync({ userId: member.user_id, role })
      .then(() => toast.success(t('members.roleUpdated')))
      .catch(toastError)

  const name =
    user.data?.display_name ||
    user.data?.email?.split('@')[0] ||
    member.user_id.slice(0, 8)

  const doRemove = () =>
    remove
      .mutateAsync(member.user_id)
      .then(() => {
        toast.success(t('members.removed'))
        setConfirmOpen(false)
      })
      .catch(toastError)

  return (
    <>
      <GridRow cols={COLS}>
        <div className="flex min-w-0 items-center gap-2.5">
          <UserAvatar name={name} seed={member.user_id} size={30} />
          <span className="min-w-0 truncate font-bold">
            {name}
            {isMe && (
              <span className="ml-1 text-[11px] font-medium text-muted-foreground">
                {t('members.you')}
              </span>
            )}
          </span>
        </div>
        <span className="truncate text-[12px] text-muted-foreground">
          {user.data?.email ?? '—'}
        </span>
        <div>
          {canEditRole ? (
            <RoleSelect
              value={member.role as 'viewer' | 'contributor' | 'manager'}
              onChange={changeRole}
              disabled={setRole.isPending}
              className="w-28"
            />
          ) : (
            <Badge variant={roleTone(member.role)}>
              {t(`roles.${member.role}`)}
            </Badge>
          )}
        </div>
        <div className="flex items-center justify-end">
          {canManage && !isLastOwner && (
            <button
              type="button"
              className="text-[12.5px] font-semibold text-destructive hover:underline"
              onClick={() => setConfirmOpen(true)}
            >
              {t('members.remove')}
            </button>
          )}
        </div>
      </GridRow>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t('members.removeTitle')}
        description={t('members.removeDescription')}
        destructive
        confirmText={t('members.remove')}
        loading={remove.isPending}
        onConfirm={doRemove}
      />
    </>
  )
}

/** 待审批的「申请加入」列表：批准（选角色）/ 拒绝。仅在有 pending 申请时渲染卡片。 */
function JoinRequestsSection({ projectId }: { projectId: string }) {
  const { t } = useTranslation('projects')
  const reqs = useProjectJoinRequests(projectId)
  const pending = reqs.data ?? []
  if (pending.length === 0) return null
  return (
    <div>
      <h2 className="mb-3 text-[15px] font-bold">
        {t('join.pendingTitle')}
        <span className="ml-2 text-[12px] font-medium text-muted-foreground">
          {pending.length}
        </span>
      </h2>
      <TableCard>
        {pending.map((r) => (
          <JoinRequestRow key={r.id} req={r} projectId={projectId} />
        ))}
      </TableCard>
    </div>
  )
}

function JoinRequestRow({
  req,
  projectId,
}: {
  req: { id: string; user_id: string; message: string }
  projectId: string
}) {
  const { t } = useTranslation('projects')
  const user = useUser(req.user_id)
  const approve = useApproveProjectJoinRequest(projectId)
  const reject = useRejectProjectJoinRequest(projectId)
  const toastError = useToastError()
  const [role, setRole] = useState<'viewer' | 'contributor' | 'manager'>(
    'contributor',
  )
  const busy = approve.isPending || reject.isPending

  const name =
    user.data?.display_name ||
    user.data?.email?.split('@')[0] ||
    req.user_id.slice(0, 8)

  const onApprove = () =>
    approve
      .mutateAsync({ reqId: req.id, role })
      .then(() => toast.success(t('join.approved')))
      .catch(toastError)
  const onReject = () =>
    reject
      .mutateAsync(req.id)
      .then(() => toast.success(t('join.rejected')))
      .catch(toastError)

  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <UserAvatar name={name} seed={req.user_id} size={30} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-bold">{name}</div>
        <div className="truncate text-[12px] text-muted-foreground">
          {req.message || user.data?.email || '—'}
        </div>
      </div>
      <RoleSelect value={role} onChange={setRole} disabled={busy} className="w-28" />
      <Button size="sm" disabled={busy} onClick={onApprove}>
        {t('join.approve')}
      </Button>
      <button
        type="button"
        disabled={busy}
        onClick={onReject}
        className="text-[12.5px] font-semibold text-destructive hover:underline disabled:opacity-60"
      >
        {t('join.reject')}
      </button>
    </div>
  )
}
