import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Loader2, Plus, UserPlus } from 'lucide-react'
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
import { useToastError } from '@/hooks/use-toast-error'
import {
  useAddOrgMember,
  useCreateTeam,
  useGrantRole,
  useOrgs,
  useTeams,
} from '@/hooks/use-orgs'
import { orgsApi, type GrantRequest } from '@/api/orgs'
import { AddMemberDialog } from './AddMemberDialog'

function TeamsTab({ orgId }: { orgId: string }) {
  const { t } = useTranslation('orgs')
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
          {teams.data.map((tm) => (
            <li
              key={tm.id}
              className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
            >
              <span className="flex items-center gap-2">
                <span className="font-medium">{tm.name}</span>
                <span className="text-muted-foreground font-mono text-xs">
                  {tm.slug}
                </span>
              </span>
              <Button variant="ghost" size="sm" onClick={() => setMemberTeam(tm.id)}>
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
            toast.success(t('addMember.added'))
          } catch (e) {
            toastError(e)
          }
        }}
      />
    </div>
  )
}

function MembersTab({ orgId }: { orgId: string }) {
  const { t } = useTranslation('orgs')
  const addMember = useAddOrgMember(orgId)
  const toastError = useToastError()
  const [open, setOpen] = useState(false)

  return (
    <div className="space-y-3">
      <Button onClick={() => setOpen(true)}>
        <UserPlus className="size-4" />
        {t('addMember.title')}
      </Button>
      <AddMemberDialog
        open={open}
        onOpenChange={setOpen}
        title={t('addMember.title')}
        onSubmit={async (userId, role) => {
          try {
            await addMember.mutateAsync({ user_id: userId, role })
            toast.success(t('addMember.added'))
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
  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }))

  const body = (): GrantRequest => ({
    principal_type: form.principal_type,
    principal_id: form.principal_id,
    role_key: form.role_key,
    scope_type: form.scope_type,
    scope_id: form.scope_id || undefined,
    resource_type: form.resource_type || undefined,
  })

  const doGrant = async () => {
    try {
      await grant.mutateAsync(body())
      toast.success(t('grants.granted'))
    } catch (e) {
      toastError(e)
    }
  }
  const doRevoke = async () => {
    try {
      await orgsApi.revokeRole(body())
      toast.success(t('grants.revoked'))
    } catch (e) {
      toastError(e)
    }
  }

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
          <Button onClick={doGrant} disabled={grant.isPending}>
            {grant.isPending && <Loader2 className="size-4 animate-spin" />}
            {t('grants.grant')}
          </Button>
          <Button variant="outline" onClick={doRevoke}>
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
        <Button variant="ghost" size="icon" onClick={() => navigate('/orgs')}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {org?.name ?? id}
          </h1>
          {org && (
            <Badge variant="secondary" className="font-mono text-xs">
              {org.slug}
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="teams">
        <TabsList>
          <TabsTrigger value="teams">{t('tabs.teams')}</TabsTrigger>
          <TabsTrigger value="members">{t('tabs.members')}</TabsTrigger>
          <TabsTrigger value="grants">{t('tabs.grants')}</TabsTrigger>
        </TabsList>
        <TabsContent value="teams" className="pt-4">
          <TeamsTab orgId={id} />
        </TabsContent>
        <TabsContent value="members" className="pt-4">
          <MembersTab orgId={id} />
        </TabsContent>
        <TabsContent value="grants" className="pt-4">
          <GrantsTab orgId={id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
