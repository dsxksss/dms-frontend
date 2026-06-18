import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Building2, Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/page-header'
import { EmptyState, ErrorState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { UserAvatar } from '@/components/user-avatar'
import { UserName } from '@/components/user-name'
import { Can } from '@/auth/Can'
import { useAuth, useCan } from '@/auth/auth-context'
import { useOrgs, useTeams } from '@/hooks/use-orgs'
import {
  useApproveJoinRequest,
  useOrgJoinRequests,
  useOrgMembers,
  useRejectJoinRequest,
} from '@/hooks/use-membership'
import { useProjects } from '@/hooks/use-projects'
import { useToastError } from '@/hooks/use-toast-error'
import { roleTone } from '@/lib/tone'
import { tintOf } from '@/lib/tile'
import type { Organization } from '@/api/orgs'
import { CreateOrgDialog } from './CreateOrgDialog'
import { MyPermissionsCard } from './MyPermissionsCard'

function Count({ value, label }: { value?: number; label: string }) {
  return (
    <span>
      <b className="text-foreground">{value == null ? '—' : value}</b> {label}
    </span>
  )
}

function OrgCard({ org }: { org: Organization }) {
  const { t } = useTranslation('orgs')
  const { t: tm } = useTranslation('membership')
  const { t: tc } = useTranslation('common')
  const navigate = useNavigate()
  const { me } = useAuth()
  const canManage = useCan('org:write')
  const toastError = useToastError()

  const members = useOrgMembers(org.id)
  const teams = useTeams(org.id)
  const projects = useProjects({ organization_id: org.id, limit: 1 })
  const jr = useOrgJoinRequests(org.id, canManage)
  const approve = useApproveJoinRequest()
  const reject = useRejectJoinRequest()

  const myRole = members.data?.find((m) => m.user_id === me?.user_id)?.role
  const requests = canManage ? (jr.data ?? []) : []
  const tint = tintOf(org.id)

  return (
    <div className="bg-card rounded-[14px] border p-[18px] shadow-[0_1px_2px_rgba(20,40,80,0.04)]">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(org.id)}
          className="group flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <span
            className="flex size-[42px] shrink-0 items-center justify-center rounded-[11px]"
            style={{ background: tint.bg, color: tint.fg }}
          >
            <Building2 className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="group-hover:text-brand block truncate text-[15px] font-bold">
              {org.name}
            </span>
            <span className="text-muted-foreground block truncate font-mono text-[11.5px]">
              @{org.slug}
            </span>
          </span>
        </button>
        {myRole && (
          <Badge variant={roleTone(myRole)}>{t(`orgRole.${myRole}`, myRole)}</Badge>
        )}
      </div>

      <div className="text-muted-foreground mt-3.5 flex flex-wrap gap-4 text-[12.5px]">
        <Count value={members.data?.length} label={t('tabs.members')} />
        <Count value={teams.data?.length} label={t('tabs.teams')} />
        <Count value={projects.data?.total} label={tc('nav.projects')} />
      </div>

      {requests.length > 0 && (
        <div className="border-divider mt-3.5 border-t pt-3">
          <div className="text-muted-foreground mb-2 text-[11px] font-bold">
            {tm('joinAdmin.title')} {requests.length}
          </div>
          {requests.map((r) => (
            <div key={r.id} className="flex items-center gap-2.5 py-1.5">
              <UserAvatar seed={r.user_id} className="size-7" />
              <div className="min-w-0 flex-1">
                <UserName
                  id={r.user_id}
                  className="block truncate text-[12.5px] font-semibold"
                />
                {r.message && (
                  <div className="text-muted-foreground truncate text-[11px]">
                    {r.message}
                  </div>
                )}
              </div>
              <Button
                size="sm"
                disabled={approve.isPending}
                onClick={async () => {
                  try {
                    await approve.mutateAsync({ id: r.id })
                    toast.success(tm('joinAdmin.approved'))
                  } catch (e) {
                    toastError(e)
                  }
                }}
              >
                {tm('joinAdmin.approve')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={reject.isPending}
                onClick={async () => {
                  try {
                    await reject.mutateAsync(r.id)
                    toast.success(tm('joinAdmin.rejected'))
                  } catch (e) {
                    toastError(e)
                  }
                }}
              >
                {tm('joinAdmin.reject')}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function OrgsListPage() {
  const { t } = useTranslation('orgs')
  const canWrite = useCan('org:write')
  const query = useOrgs()
  const [createOpen, setCreateOpen] = useState(false)
  const orgs = query.data ?? []

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <PageHeader
        title={t('title')}
        titleI18n={{ key: 'title', ns: 'orgs' }}
        description={t('subtitle')}
        actions={
          <Can perm="org:write">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              {t('create.title')}
            </Button>
          </Can>
        }
      />

      {query.isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="text-muted-foreground size-6 animate-spin" />
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : orgs.length === 0 ? (
        <EmptyState
          title={t('empty')}
          description={t('emptyDesc')}
          action={
            canWrite ? (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" />
                {t('create.title')}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
          {orgs.map((org) => (
            <OrgCard key={org.id} org={org} />
          ))}
        </div>
      )}

      <MyPermissionsCard />

      <CreateOrgDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
