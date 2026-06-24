import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ArrowLeft, Building2, Check, Plus, Search, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/page-header'
import { TableCard, GridHeader, GridRow, Th } from '@/components/data-grid'
import { EmptyState } from '@/components/states'
import { UserAvatar } from '@/components/user-avatar'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { tintOf } from '@/components/brand-tile'
import { roleTone } from '@/components/tone'
import { cn } from '@/lib/utils'
import { useAuth } from '@/auth/auth-context'
import { useOrgs, useTeams, useCreateTeam, useGrantRole } from '@/hooks/use-orgs'
import { GRANTABLE_ROLES } from '@/lib/roles'
import { AppError } from '@/lib/errors'
import { OrgRegistryTab } from './OrgRegistryTab'
import {
  useApproveJoinRequest,
  useInviteToOrg,
  useOrgJoinRequests,
  useOrgMembers,
  useRejectJoinRequest,
  useRemoveOrgMember,
  useSetOrgMemberRole,
  useUserSearch,
} from '@/hooks/use-membership'
import { useDebounce } from '@/hooks/use-debounce'
import { useToastError } from '@/hooks/use-toast-error'
import { autoSlug } from '@/lib/slug'

const MCOLS = '1.8fr 1fr 150px 70px'

export function OrgDetailPage() {
  const { id = '' } = useParams()
  const { t } = useTranslation('orgs')
  const { me } = useAuth()
  const orgs = useOrgs()
  const org = orgs.data?.find((o) => o.id === id)
  const members = useOrgMembers(id)
  const myRole = members.data?.find((m) => m.user_id === me?.user_id)?.role
  const isAdmin = myRole === 'admin'
  const [inviteOpen, setInviteOpen] = useState(false)
  const [tintBg, tintFg] = tintOf(id)

  if (!org) {
    return (
      <div className="mx-auto max-w-[920px] px-8 py-7">
        <EmptyState title={t('empty')} />
      </div>
    )
  }

  // 非该组织成员（如租户 owner 仅在列表「看得到」组织）：成员/资产/数据等端点都 403。
  // 整页给清楚提示，避免逐个 Tab 报通用 forbidden。
  const notMember =
    members.isError &&
    members.error instanceof AppError &&
    members.error.status === 403
  if (notMember) {
    return (
      <div className="mx-auto max-w-[920px] px-8 py-7">
        <Link
          to="/orgs"
          className="mb-2 inline-flex items-center gap-1 text-[12.5px] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          {t('title')}
        </Link>
        <PageHeader title={org.name} size="md" description={`@${org.slug}`} />
        <div className="mt-4">
          <EmptyState
            title={t('registry.notMember')}
            hint={t('notMemberDesc')}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[920px] px-8 py-7">
      <Link
        to="/orgs"
        className="mb-2 inline-flex items-center gap-1 text-[12.5px] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        {t('title')}
      </Link>
      <PageHeader
        title={org.name}
        size="md"
        description={`@${org.slug}`}
        actions={
          isAdmin && (
            <Button onClick={() => setInviteOpen(true)}>
              <Plus className="size-4" />
              {t('addMember.title')}
            </Button>
          )
        }
      />
      <div className="mb-4 flex items-center gap-3">
        <div
          className="flex size-[42px] items-center justify-center rounded-[11px]"
          style={{ background: tintBg, color: tintFg }}
        >
          <Building2 className="size-5" />
        </div>
        {myRole && <Badge variant={roleTone(myRole)}>{t(`orgRole.${myRole}`)}</Badge>}
      </div>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">{t('tabs.members')}</TabsTrigger>
          <TabsTrigger value="teams">{t('tabs.teams')}</TabsTrigger>
          <TabsTrigger value="assets">{t('tabs.assets')}</TabsTrigger>
          <TabsTrigger value="data">{t('tabs.data')}</TabsTrigger>
          {isAdmin && <TabsTrigger value="grants">{t('tabs.grants')}</TabsTrigger>}
          {isAdmin && <TabsTrigger value="join">{t('tabs.join')}</TabsTrigger>}
        </TabsList>

        <TabsContent value="members" className="mt-4">
          <MembersTab orgId={id} canManage={isAdmin} meId={me?.user_id ?? null} />
        </TabsContent>
        <TabsContent value="teams" className="mt-4">
          <TeamsTab orgId={id} canManage={isAdmin} />
        </TabsContent>
        <TabsContent value="assets" className="mt-4">
          <OrgRegistryTab orgId={id} kind="asset" isAdmin={isAdmin} />
        </TabsContent>
        <TabsContent value="data" className="mt-4">
          <OrgRegistryTab orgId={id} kind="template" isAdmin={isAdmin} />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="grants" className="mt-4">
            <GrantsTab orgId={id} />
          </TabsContent>
        )}
        {isAdmin && (
          <TabsContent value="join" className="mt-4">
            <JoinTab orgId={id} />
          </TabsContent>
        )}
      </Tabs>

      <InviteOrgDialog orgId={id} open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  )
}

function MembersTab({
  orgId,
  canManage,
  meId,
}: {
  orgId: string
  canManage: boolean
  meId: string | null
}) {
  const { t } = useTranslation('orgs')
  const members = useOrgMembers(orgId)
  const setRole = useSetOrgMemberRole(orgId)
  const remove = useRemoveOrgMember(orgId)
  const toastError = useToastError()
  const [removeId, setRemoveId] = useState<string | null>(null)
  const data = members.data ?? []

  if (data.length === 0) return <EmptyState title={t('addMember.empty')} />

  return (
    <>
      <TableCard>
        <GridHeader cols={MCOLS}>
          <Th>{t('columns.name')}</Th>
          <Th>Email</Th>
          <Th>{t('grants.roleKey')}</Th>
          <Th />
        </GridHeader>
        {data.map((m) => (
          <GridRow key={m.user_id} cols={MCOLS}>
            <div className="flex items-center gap-2.5">
              <UserAvatar name={m.display_name || m.email} seed={m.user_id} size={30} />
              <span className="truncate font-bold">
                {m.display_name || m.email.split('@')[0]}
                {m.user_id === meId && (
                  <span className="ml-1 text-[11px] font-medium text-muted-foreground">
                    {t('members.you')}
                  </span>
                )}
              </span>
            </div>
            <span className="truncate text-[12px] text-muted-foreground">
              {m.email}
            </span>
            <div>
              {canManage ? (
                <Select
                  value={m.role}
                  onValueChange={(role) =>
                    setRole
                      .mutateAsync({ userId: m.user_id, role })
                      .then(() => toast.success(t('grants.granted')))
                      .catch(toastError)
                  }
                >
                  <SelectTrigger className="h-8 w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">{t('orgRole.admin')}</SelectItem>
                    <SelectItem value="member">{t('orgRole.member')}</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant={roleTone(m.role)}>{t(`orgRole.${m.role}`)}</Badge>
              )}
            </div>
            <div>
              {canManage && m.user_id !== meId && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setRemoveId(m.user_id)}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              )}
            </div>
          </GridRow>
        ))}
      </TableCard>
      <ConfirmDialog
        open={!!removeId}
        onOpenChange={(o) => !o && setRemoveId(null)}
        title={t('members.removeTitle')}
        description={t('members.removeDescription')}
        destructive
        confirmText={t('members.remove')}
        loading={remove.isPending}
        onConfirm={() =>
          remove
            .mutateAsync(removeId!)
            .then(() => {
              toast.success(t('members.removed'))
              setRemoveId(null)
            })
            .catch(toastError)
        }
      />
    </>
  )
}

function TeamsTab({ orgId, canManage }: { orgId: string; canManage: boolean }) {
  const { t } = useTranslation('orgs')
  const teams = useTeams(orgId)
  const create = useCreateTeam(orgId)
  const toastError = useToastError()
  const [name, setName] = useState('')
  const data = teams.data ?? []

  const add = () => {
    if (!name.trim()) return
    create
      .mutateAsync({ name: name.trim(), slug: autoSlug(name, 'team') })
      .then(() => {
        toast.success(t('teams.created'))
        setName('')
      })
      .catch(toastError)
  }

  return (
    <div className="space-y-3">
      {canManage && (
        <div className="flex gap-2">
          <Input
            placeholder={t('teams.name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
          <Button onClick={add} disabled={!name.trim() || create.isPending}>
            <Plus className="size-4" />
            {t('teams.create')}
          </Button>
        </div>
      )}
      {data.length === 0 ? (
        <EmptyState title={t('teams.empty')} />
      ) : (
        <TableCard>
          {data.map((tm) => (
            <GridRow key={tm.id} cols="1fr 120px">
              <span className="font-bold">{tm.name}</span>
              <span className="mono text-[12px] text-muted-foreground">@{tm.slug}</span>
            </GridRow>
          ))}
        </TableCard>
      )}
    </div>
  )
}

function JoinTab({ orgId }: { orgId: string }) {
  const { t } = useTranslation('orgs')
  const requests = useOrgJoinRequests(orgId, true)
  const approve = useApproveJoinRequest()
  const reject = useRejectJoinRequest()
  const toastError = useToastError()
  const data = requests.data ?? []

  if (data.length === 0) return <EmptyState title={t('tabs.join')} />

  return (
    <TableCard>
      {data.map((r) => (
        <GridRow key={r.id} cols="1fr 160px">
          <div className="flex items-center gap-2.5">
            <UserAvatar name={r.user_id} seed={r.user_id} size={28} />
            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold">
                {r.user_id.slice(0, 8)}
              </div>
              <div className="truncate text-[11.5px] text-muted-foreground">
                {r.message}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              onClick={() =>
                approve
                  .mutateAsync({ id: r.id })
                  .then(() => toast.success(t('grants.granted')))
                  .catch(toastError)
              }
            >
              {t('grants.grant')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                reject
                  .mutateAsync(r.id)
                  .then(() => toast.success(t('grants.revoked')))
                  .catch(toastError)
              }
            >
              {t('grants.revoke')}
            </Button>
          </div>
        </GridRow>
      ))}
    </TableCard>
  )
}

/**
 * 角色授予：把作用域角色（含审计管理员 auditor）授予某组织成员。
 * 经 `/v1/role-grants` 写入；后端无列表端点，故为「授予即生效」无回显（成功即提示）。
 */
function GrantsTab({ orgId }: { orgId: string }) {
  const { t } = useTranslation('orgs')
  const members = useOrgMembers(orgId)
  const grant = useGrantRole()
  const toastError = useToastError()
  const [userId, setUserId] = useState('')
  const [roleKey, setRoleKey] = useState<string>('auditor')
  const data = members.data ?? []

  const submit = () => {
    if (!userId) return
    grant
      .mutateAsync({
        principal_type: 'user',
        principal_id: userId,
        role_key: roleKey,
        scope_type: 'organization',
        scope_id: orgId,
      })
      .then(() => {
        toast.success(t('grants.granted'))
        setUserId('')
      })
      .catch(toastError)
  }

  return (
    <div className="max-w-xl space-y-4">
      <p className="text-[12.5px] text-muted-foreground">{t('grants.desc')}</p>
      <div className="space-y-1.5">
        <Label>{t('grants.selectUser')}</Label>
        <Select value={userId} onValueChange={setUserId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t('grants.selectUser')} />
          </SelectTrigger>
          <SelectContent>
            {data.map((m) => (
              <SelectItem key={m.user_id} value={m.user_id}>
                {m.display_name} · {m.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>{t('grants.roleKey')}</Label>
        <Select value={roleKey} onValueChange={setRoleKey}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GRANTABLE_ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {t(`grants.roles.${r}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="neutral">{t('grants.scope.organization')}</Badge>
        <Button onClick={submit} disabled={!userId || grant.isPending}>
          {t('grants.grant')}
        </Button>
      </div>
    </div>
  )
}

function InviteOrgDialog({
  orgId,
  open,
  onOpenChange,
}: {
  orgId: string
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const { t } = useTranslation('orgs')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [role, setRole] = useState('member')
  const debounced = useDebounce(search, 300)
  const results = useUserSearch(debounced)
  const invite = useInviteToOrg(orgId)
  const toastError = useToastError()
  const ids = useMemo(
    () => Object.keys(selected).filter((k) => selected[k]),
    [selected],
  )

  const send = () => {
    if (ids.length === 0) return
    invite
      .mutateAsync({ user_ids: ids, role })
      .then(() => {
        toast.success(t('addMember.added'))
        onOpenChange(false)
        setSelected({})
        setSearch('')
      })
      .catch(toastError)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t('addMember.title')}</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute top-2.5 left-3 size-[15px] text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={t('addMember.userPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="max-h-[240px] overflow-auto">
          {(results.data ?? []).map((u) => {
            const on = !!selected[u.id]
            return (
              <button
                type="button"
                key={u.id}
                onClick={() => setSelected((s) => ({ ...s, [u.id]: !s[u.id] }))}
                className="flex w-full items-center gap-2.5 rounded-[9px] px-1.5 py-2 text-left hover:bg-surface-2"
              >
                <UserAvatar name={u.display_name || u.email} seed={u.id} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold">
                    {u.display_name || u.email.split('@')[0]}
                  </div>
                  <div className="truncate text-[11.5px] text-muted-foreground">
                    {u.email}
                  </div>
                </div>
                <span
                  className={cn(
                    'flex size-5 items-center justify-center rounded-md border',
                    on ? 'border-brand bg-brand text-white' : 'border-[#c7cdd8]',
                  )}
                >
                  {on && <Check className="size-3" />}
                </span>
              </button>
            )
          })}
          {(results.data ?? []).length === 0 && (
            <p className="py-6 text-center text-[12.5px] text-muted-foreground">
              {t('addMember.empty')}
            </p>
          )}
        </div>
        <DialogFooter className="items-center gap-2 sm:justify-between">
          <div className="flex items-center gap-2">
            <Label className="text-[12.5px]">{t('addMember.role')}</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="h-8 w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">{t('orgRole.member')}</SelectItem>
                <SelectItem value="admin">{t('orgRole.admin')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={send} disabled={ids.length === 0 || invite.isPending}>
            {t('addMember.submit')} ({ids.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
