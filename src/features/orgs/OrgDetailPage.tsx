import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Check, Loader2, Plus, Trash2, UserPlus, X } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EmptyState, TableSkeleton } from '@/components/states'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useCan } from '@/auth/auth-context'
import { useToastError } from '@/hooks/use-toast-error'
import { useCreateTeam, useGrantRole, useOrgs, useTeams } from '@/hooks/use-orgs'
import {
  useApproveJoinRequest,
  useInviteToOrg,
  useOrgInvitations,
  useOrgJoinRequests,
  useOrgMembers,
  useRejectJoinRequest,
  useRemoveOrgMember,
  useRevokeInvitation,
  useSetOrgMemberRole,
} from '@/hooks/use-membership'
import { membershipApi } from '@/api/membership'
import { orgsApi, type GrantRequest } from '@/api/orgs'
import { UserName } from '@/components/user-name'
import { InvitePanel } from '@/features/membership/InvitePanel'
import { AddMemberDialog } from './AddMemberDialog'

const ORG_ROLES = ['admin', 'member']

function MembersTab({ orgId }: { orgId: string }) {
  const { t } = useTranslation('membership')
  const { t: to } = useTranslation('orgs')
  const canManage = useCan('org:write')
  const members = useOrgMembers(orgId)
  const setRole = useSetOrgMemberRole(orgId)
  const removeM = useRemoveOrgMember(orgId)
  const invitations = useOrgInvitations(orgId)
  const invite = useInviteToOrg(orgId)
  const revoke = useRevokeInvitation()
  const toastError = useToastError()
  const [removeId, setRemoveId] = useState<string | null>(null)

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-3">
        <h2 className="font-medium">{t('members.title')}</h2>
        {members.isLoading ? (
          <TableSkeleton rows={3} cols={2} />
        ) : members.data && members.data.length > 0 ? (
          <ul className="divide-y rounded-md border">
            {members.data.map((m) => (
              <li
                key={m.user_id}
                className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
              >
                <span className="flex flex-col">
                  <span>{m.display_name || m.email}</span>
                  <span className="text-muted-foreground text-xs">{m.email}</span>
                </span>
                <span className="flex items-center gap-2">
                  {canManage ? (
                    <Select
                      value={m.role}
                      onValueChange={async (role) => {
                        try {
                          await setRole.mutateAsync({ userId: m.user_id, role })
                          toast.success(t('members.roleUpdated'))
                        } catch (e) {
                          toastError(e)
                        }
                      }}
                    >
                      <SelectTrigger size="sm" className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ORG_ROLES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {to(`orgRole.${r}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="secondary">{to(`orgRole.${m.role}`)}</Badge>
                  )}
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => setRemoveId(m.user_id)}
                    >
                      <Trash2 className="text-destructive size-4" />
                    </Button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title={t('members.empty')} />
        )}
      </div>

      <InvitePanel
        canInvite={canManage}
        invite={invite}
        invitations={invitations.data ?? []}
        isLoading={invitations.isLoading}
        onRevoke={async (id) => {
          try {
            await revoke.mutateAsync(id)
            toast.success(t('inbox.cancelled'))
          } catch (e) {
            toastError(e)
          }
        }}
        revoking={revoke.isPending}
        roleOptions={ORG_ROLES}
        defaultRole="member"
        roleLabel={(r) => to(`orgRole.${r}`)}
      />

      <ConfirmDialog
        open={!!removeId}
        onOpenChange={(o) => !o && setRemoveId(null)}
        title={t('members.removeTitle')}
        description={t('members.removeDesc')}
        destructive
        loading={removeM.isPending}
        onConfirm={async () => {
          if (removeId) {
            try {
              await removeM.mutateAsync(removeId)
              toast.success(t('members.removed'))
            } catch (e) {
              toastError(e)
            }
          }
          setRemoveId(null)
        }}
      />
    </div>
  )
}

function JoinRequestsTab({ orgId }: { orgId: string }) {
  const { t } = useTranslation('membership')
  const canManage = useCan('org:write')
  const jr = useOrgJoinRequests(orgId)
  const approve = useApproveJoinRequest()
  const reject = useRejectJoinRequest()
  const toastError = useToastError()

  const setDiscoverable = async (discoverable: boolean) => {
    try {
      await membershipApi.updateOrg(orgId, { discoverable })
      toast.success(t('org.updated'))
    } catch (e) {
      toastError(e)
    }
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex items-center gap-2 rounded-lg border p-3">
          <span className="text-sm">{t('org.discoverable')}</span>
          <Button variant="outline" size="sm" onClick={() => setDiscoverable(true)}>
            <Check className="size-4" /> On
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDiscoverable(false)}>
            <X className="size-4" /> Off
          </Button>
        </div>
      )}

      <h2 className="font-medium">{t('joinAdmin.title')}</h2>
      {jr.isLoading ? (
        <TableSkeleton rows={2} cols={2} />
      ) : jr.data && jr.data.length > 0 ? (
        <ul className="divide-y rounded-md border">
          {jr.data.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
            >
              <span className="flex flex-col">
                <UserName id={r.user_id} className="text-sm" />
                {r.message && (
                  <span className="text-muted-foreground text-xs">{r.message}</span>
                )}
              </span>
              {canManage && (
                <span className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        await approve.mutateAsync({ id: r.id })
                        toast.success(t('joinAdmin.approved'))
                      } catch (e) {
                        toastError(e)
                      }
                    }}
                  >
                    {t('joinAdmin.approve')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      try {
                        await reject.mutateAsync(r.id)
                        toast.success(t('joinAdmin.rejected'))
                      } catch (e) {
                        toastError(e)
                      }
                    }}
                  >
                    {t('joinAdmin.reject')}
                  </Button>
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title={t('joinAdmin.empty')} />
      )}
    </div>
  )
}

function TeamsTab({ orgId }: { orgId: string }) {
  const { t } = useTranslation('orgs')
  const { t: tm } = useTranslation('membership')
  const teams = useTeams(orgId)
  const createTeam = useCreateTeam(orgId)
  const toastError = useToastError()
  const [slug, setSlug] = useState('')
  const [name, setName] = useState('')
  const [memberTeam, setMemberTeam] = useState<string | null>(null)

  const create = async () => {
    if (!slug.trim() || !name.trim()) return
    try {
      await createTeam.mutateAsync({ slug, name })
      toast.success(t('teams.created'))
      setSlug('')
      setName('')
    } catch (e) {
      toastError(e)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2 rounded-lg border p-3">
        <div className="space-y-1.5">
          <Label>{t('teams.slug')}</Label>
          <Input className="w-40" value={slug} onChange={(e) => setSlug(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>{t('teams.name')}</Label>
          <Input className="w-48" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <Button onClick={create} disabled={createTeam.isPending}>
          {createTeam.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Plus className="size-4" />
          )}
          {t('teams.create')}
        </Button>
      </div>

      {teams.isLoading ? (
        <TableSkeleton rows={2} cols={2} />
      ) : teams.data && teams.data.length > 0 ? (
        <ul className="divide-y rounded-md border">
          {teams.data.map((tm2) => (
            <li
              key={tm2.id}
              className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
            >
              <span className="flex items-center gap-2">
                <span className="font-medium">{tm2.name}</span>
                <span className="text-muted-foreground font-mono text-xs">
                  {tm2.slug}
                </span>
              </span>
              <Button variant="ghost" size="sm" onClick={() => setMemberTeam(tm2.id)}>
                <UserPlus className="size-4" />
                {t('teams.addMember')}
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title={t('teams.empty')} />
      )}

      <AddMemberDialog
        open={!!memberTeam}
        onOpenChange={(o) => !o && setMemberTeam(null)}
        title={t('teams.addMember')}
        onSubmit={async (userId, role) => {
          try {
            await orgsApi.addTeamMember(memberTeam!, { user_id: userId, role })
            toast.success(tm('members.roleUpdated'))
          } catch (e) {
            toastError(e)
          }
        }}
      />
    </div>
  )
}

function GrantsTab({ orgId }: { orgId: string }) {
  const { t } = useTranslation('orgs')
  const grant = useGrantRole()
  const toastError = useToastError()
  const [form, setForm] = useState({
    principal_type: 'user',
    principal_id: '',
    role_key: '',
    scope_type: 'organization',
    scope_id: orgId,
    resource_type: '',
  })
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const body = (): GrantRequest => ({
    principal_type: form.principal_type,
    principal_id: form.principal_id,
    role_key: form.role_key,
    scope_type: form.scope_type,
    scope_id: form.scope_id || undefined,
    resource_type: form.resource_type || undefined,
  })

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="text-base">{t('grants.title')}</CardTitle>
        <p className="text-muted-foreground text-sm">{t('grants.desc')}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>{t('grants.principalType')}</Label>
            <Select
              value={form.principal_type}
              onValueChange={(v) => set('principal_type', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">{t('grants.principal.user')}</SelectItem>
                <SelectItem value="team">{t('grants.principal.team')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t('grants.principalId')}</Label>
            <Input
              value={form.principal_id}
              onChange={(e) => set('principal_id', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t('grants.roleKey')}</Label>
            <Input value={form.role_key} onChange={(e) => set('role_key', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t('grants.scopeType')}</Label>
            <Select value={form.scope_type} onValueChange={(v) => set('scope_type', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tenant">{t('grants.scope.tenant')}</SelectItem>
                <SelectItem value="organization">
                  {t('grants.scope.organization')}
                </SelectItem>
                <SelectItem value="team">{t('grants.scope.team')}</SelectItem>
                <SelectItem value="resource">{t('grants.scope.resource')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t('grants.scopeId')}</Label>
            <Input value={form.scope_id} onChange={(e) => set('scope_id', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t('grants.resourceType')}</Label>
            <Input
              value={form.resource_type}
              onChange={(e) => set('resource_type', e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={async () => {
              try {
                await grant.mutateAsync(body())
                toast.success(t('grants.granted'))
              } catch (e) {
                toastError(e)
              }
            }}
            disabled={grant.isPending}
          >
            {grant.isPending && <Loader2 className="size-4 animate-spin" />}
            {t('grants.grant')}
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await orgsApi.revokeRole(body())
                toast.success(t('grants.revoked'))
              } catch (e) {
                toastError(e)
              }
            }}
          >
            {t('grants.revoke')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function OrgDetailPage() {
  const { id = '' } = useParams()
  const { t } = useTranslation('orgs')
  const navigate = useNavigate()
  const orgs = useOrgs()
  const org = orgs.data?.find((o) => o.id === id)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('..', { relative: 'path' })}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{org?.name ?? id}</h1>
          {org && (
            <Badge variant="secondary" className="font-mono text-xs">
              {org.slug}
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">{t('tabs.members')}</TabsTrigger>
          <TabsTrigger value="teams">{t('tabs.teams')}</TabsTrigger>
          <TabsTrigger value="join">{t('tabs.join')}</TabsTrigger>
          <TabsTrigger value="grants">{t('tabs.grants')}</TabsTrigger>
        </TabsList>
        <TabsContent value="members" className="pt-4">
          <MembersTab orgId={id} />
        </TabsContent>
        <TabsContent value="teams" className="pt-4">
          <TeamsTab orgId={id} />
        </TabsContent>
        <TabsContent value="join" className="pt-4">
          <JoinRequestsTab orgId={id} />
        </TabsContent>
        <TabsContent value="grants" className="pt-4">
          <GrantsTab orgId={id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
