import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Building2, Loader2, Plus } from 'lucide-react'

import { PageHeader } from '@/components/page-header'
import { EmptyState, ErrorState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Can } from '@/auth/Can'
import { useCan } from '@/auth/auth-context'
import { useOrgs } from '@/hooks/use-orgs'
import { tintOf } from '@/lib/tile'
import type { Organization } from '@/api/orgs'
import { CreateOrgDialog } from './CreateOrgDialog'
import { MyPermissionsCard } from './MyPermissionsCard'

function OrgCard({ org }: { org: Organization }) {
  const { t } = useTranslation('orgs')
  const tint = tintOf(org.id)
  return (
    <Link
      to={org.id}
      className="group bg-card hover:border-brand/40 flex items-center gap-3 rounded-[14px] border p-[18px] shadow-[0_1px_2px_rgba(20,40,80,0.04)] transition-all hover:shadow-[0_8px_24px_rgba(20,40,80,0.08)]"
    >
      <span
        className="flex size-[42px] shrink-0 items-center justify-center rounded-[11px]"
        style={{ background: tint.bg, color: tint.fg }}
      >
        <Building2 className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-bold">{org.name}</div>
        <div className="text-muted-foreground truncate font-mono text-[11.5px]">
          @{org.slug}
        </div>
      </div>
      <span className="text-brand text-[12.5px] font-semibold opacity-0 transition-opacity group-hover:opacity-100">
        {t('actions.open', { ns: 'common' })} →
      </span>
    </Link>
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
