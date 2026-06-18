import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Building2, FolderClosed, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/page-header'
import { EmptyState } from '@/components/states'
import { roleTone } from '@/components/tone'
import {
  useAcceptInvitation,
  useCancelJoinRequest,
  useDeclineInvitation,
  useDiscoverable,
  useMyInvitations,
  useMyJoinRequests,
  useRequestJoin,
} from '@/hooks/use-membership'
import { useToastError } from '@/hooks/use-toast-error'
import { useDebounce } from '@/hooks/use-debounce'

export function InboxPage() {
  const { t } = useTranslation('membership')
  return (
    <div className="mx-auto max-w-[760px] px-8 py-7">
      <PageHeader title={t('inbox.title')} titleEn="Invitations" description={t('inbox.subtitle')} size="md" />
      <Tabs defaultValue="invitations">
        <TabsList>
          <TabsTrigger value="invitations">{t('inbox.tabInvitations')}</TabsTrigger>
          <TabsTrigger value="requests">{t('inbox.tabJoinRequests')}</TabsTrigger>
          <TabsTrigger value="discover">{t('inbox.tabDiscover')}</TabsTrigger>
        </TabsList>
        <TabsContent value="invitations" className="mt-4">
          <InvitationsTab />
        </TabsContent>
        <TabsContent value="requests" className="mt-4">
          <RequestsTab />
        </TabsContent>
        <TabsContent value="discover" className="mt-4">
          <DiscoverTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function InvitationsTab() {
  const { t } = useTranslation('membership')
  const invites = useMyInvitations()
  const accept = useAcceptInvitation()
  const decline = useDeclineInvitation()
  const toastError = useToastError()
  const data = invites.data ?? []
  if (data.length === 0) return <EmptyState title={t('inbox.noInvitations')} />

  return (
    <div className="flex flex-col gap-3">
      {data.map((iv) => (
        <div
          key={iv.id}
          className="card-shadow flex items-center gap-3.5 rounded-[14px] border bg-card px-[18px] py-4"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-[11px] bg-accent text-brand">
            {iv.kind === 'org' ? (
              <Building2 className="size-5" />
            ) : (
              <FolderClosed className="size-5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14px] font-bold">{iv.target_name}</div>
            <div className="text-[12px] text-muted-foreground">
              {t(`inbox.kind.${iv.kind}`)} · {iv.message || ''}
            </div>
          </div>
          {iv.role && <Badge variant={roleTone(iv.role)}>{iv.role}</Badge>}
          <Button
            size="sm"
            onClick={() =>
              accept
                .mutateAsync(iv.id)
                .then(() => toast.success(t('inbox.accepted')))
                .catch(toastError)
            }
          >
            {t('inbox.accept')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              decline
                .mutateAsync(iv.id)
                .then(() => toast.success(t('inbox.declined')))
                .catch(toastError)
            }
          >
            {t('inbox.decline')}
          </Button>
        </div>
      ))}
    </div>
  )
}

function RequestsTab() {
  const { t } = useTranslation('membership')
  const reqs = useMyJoinRequests()
  const cancel = useCancelJoinRequest()
  const toastError = useToastError()
  const data = reqs.data ?? []
  if (data.length === 0) return <EmptyState title={t('inbox.noJoinRequests')} />

  return (
    <div className="flex flex-col gap-3">
      {data.map((r) => (
        <div
          key={r.id}
          className="card-shadow flex items-center gap-3.5 rounded-[14px] border bg-card px-[18px] py-4"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-[11px] bg-accent text-brand">
            <Building2 className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14px] font-bold">{r.org_name}</div>
            <div className="text-[12px] text-muted-foreground">{r.message}</div>
          </div>
          <Badge variant="neutral">{r.status}</Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              cancel
                .mutateAsync(r.id)
                .then(() => toast.success(t('inbox.cancelled')))
                .catch(toastError)
            }
          >
            {t('inbox.cancel')}
          </Button>
        </div>
      ))}
    </div>
  )
}

function DiscoverTab() {
  const { t } = useTranslation('membership')
  const [search, setSearch] = useState('')
  const debounced = useDebounce(search, 300)
  const orgs = useDiscoverable(debounced)
  const request = useRequestJoin()
  const toastError = useToastError()
  const data = orgs.data ?? []

  return (
    <div>
      <div className="relative mb-3">
        <Search className="absolute top-2.5 left-3 size-[15px] text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder={t('discover.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {data.length === 0 ? (
        <EmptyState title={t('discover.empty')} />
      ) : (
        <div className="flex flex-col gap-2.5">
          {data.map((o) => (
            <div
              key={o.id}
              className="card-shadow flex items-center gap-3 rounded-[12px] border bg-card px-4 py-3"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-accent text-brand">
                <Building2 className="size-[18px]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-bold">{o.name}</div>
                <div className="truncate text-[11.5px] text-muted-foreground">
                  @{o.slug}
                </div>
              </div>
              <Button
                size="sm"
                onClick={() =>
                  request
                    .mutateAsync({ orgId: o.id })
                    .then(() => toast.success(t('discover.requested')))
                    .catch(toastError)
                }
              >
                {t('discover.request')}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
