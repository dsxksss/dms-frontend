import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Building2, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/page-header'
import { EmptyState, ErrorState, GridSkeleton } from '@/components/states'
import { UserAvatar } from '@/components/user-avatar'
import { tintOf } from '@/components/brand-tile'
import { roleTone } from '@/components/tone'
import { useAuth } from '@/auth/auth-context'
import { useOrgs, useTeams } from '@/hooks/use-orgs'
import { useProjects } from '@/hooks/use-projects'
import {
  useApproveJoinRequest,
  useOrgJoinRequests,
  useOrgMembers,
  useRejectJoinRequest,
} from '@/hooks/use-membership'
import { useToastError } from '@/hooks/use-toast-error'
import type { Organization } from '@/api/orgs'
import { CreateOrgDialog } from './CreateOrgDialog'

export function OrgsListPage() {
  const { t } = useTranslation('orgs')
  const [createOpen, setCreateOpen] = useState(false)
  const orgs = useOrgs()

  return (
    <div className="mx-auto max-w-[1100px] px-8 py-7">
      <PageHeader
        title={t('title')}
        titleEn="Organizations"
        description={t('subtitle')}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            {t('create.title')}
          </Button>
        }
      />

      {orgs.isLoading ? (
        <GridSkeleton count={2} columns={2} />
      ) : orgs.isError ? (
        <ErrorState error={orgs.error} onRetry={() => orgs.refetch()} />
      ) : (orgs.data ?? []).length === 0 ? (
        <EmptyState title={t('empty')} hint={t('emptyDesc')} />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {(orgs.data ?? []).map((o) => (
            <OrgCard key={o.id} org={o} />
          ))}
        </div>
      )}

      <CreateOrgDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}

function OrgCard({ org }: { org: Organization }) {
  const { t } = useTranslation('orgs')
  const { me } = useAuth()
  const members = useOrgMembers(org.id)
  const teams = useTeams(org.id)
  const projects = useProjects({ organization_id: org.id, limit: 1 })
  const toastError = useToastError()

  const myRole = members.data?.find((m) => m.user_id === me?.user_id)?.role
  const canManage = myRole === 'admin'
  const requests = useOrgJoinRequests(org.id, canManage)
  const approve = useApproveJoinRequest()
  const reject = useRejectJoinRequest()
  const [tintBg, tintFg] = tintOf(org.id)

  const onApprove = (id: string, who: string) =>
    approve
      .mutateAsync({ id })
      .then(() => toast.success(t('grants.granted') + ' · ' + who))
      .catch(toastError)
  const onReject = (id: string) =>
    reject.mutateAsync(id).then(() => toast.success(t('grants.revoked'))).catch(toastError)

  return (
    <div className="card-shadow rounded-[14px] border bg-card p-[18px]">
      <div className="flex items-center gap-3">
        <div
          className="flex size-[42px] shrink-0 items-center justify-center rounded-[11px]"
          style={{ background: tintBg, color: tintFg }}
        >
          <Building2 className="size-5" />
        </div>
        <Link to={`/orgs/${org.id}`} className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-bold hover:text-brand">
            {org.name}
          </div>
          <div className="truncate text-[11.5px] text-muted-foreground">
            @{org.slug}
          </div>
        </Link>
        {org.is_default && <Badge variant="info">{t('defaultBadge')}</Badge>}
        {myRole && (
          <Badge variant={roleTone(myRole)}>{t(`orgRole.${myRole}`)}</Badge>
        )}
      </div>

      <div className="mt-3.5 flex gap-[18px] text-[12.5px] text-muted-foreground">
        <span>
          <b className="text-foreground">{members.data?.length ?? '·'}</b>{' '}
          {t('tabs.members')}
        </span>
        <span>
          <b className="text-foreground">{teams.data?.length ?? '·'}</b>{' '}
          {t('teams.title')}
        </span>
        <span>
          <b className="text-foreground">{projects.data?.total ?? '·'}</b>{' '}
          {t('permissions.resources.project')}
        </span>
      </div>

      {canManage && (requests.data?.length ?? 0) > 0 && (
        <div className="mt-3.5 border-t border-divider pt-3">
          <div className="mb-2 text-[11px] font-bold text-muted-foreground">
            {t('tabs.join')} · {requests.data?.length}
          </div>
          {requests.data?.map((r) => (
            <div key={r.id} className="flex items-center gap-2.5 py-1.5">
              <UserAvatar name={r.org_name} seed={r.user_id} size={24} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12.5px] font-semibold">
                  {r.user_id.slice(0, 8)}
                </div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {r.message}
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => onApprove(r.id, r.user_id.slice(0, 8))}
              >
                {t('grants.grant')}
              </Button>
              <Button size="sm" variant="outline" onClick={() => onReject(r.id)}>
                {t('grants.revoke')}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
