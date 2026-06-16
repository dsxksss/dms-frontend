import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState, TableSkeleton } from '@/components/states'
import { useDebounce } from '@/hooks/use-debounce'
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

function InvitationsTab() {
  const { t } = useTranslation('membership')
  const list = useMyInvitations()
  const accept = useAcceptInvitation()
  const decline = useDeclineInvitation()
  const toastError = useToastError()

  if (list.isLoading) return <TableSkeleton rows={3} cols={2} />
  if (!list.data || list.data.length === 0)
    return <EmptyState title={t('inbox.noInvitations')} />

  return (
    <ul className="divide-y rounded-md border">
      {list.data.map((inv) => (
        <li key={inv.id} className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex flex-col">
            <span className="flex items-center gap-2 text-sm">
              <Badge variant="secondary">{t(`inbox.kind.${inv.kind}`)}</Badge>
              <span className="font-medium">{inv.target_name}</span>
              <span className="text-muted-foreground">· {inv.role}</span>
            </span>
            {inv.message && (
              <span className="text-muted-foreground text-xs">{inv.message}</span>
            )}
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              onClick={async () => {
                try {
                  await accept.mutateAsync(inv.id)
                  toast.success(t('inbox.accepted'))
                } catch (e) {
                  toastError(e)
                }
              }}
            >
              <Check className="size-4" />
              {t('inbox.accept')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                try {
                  await decline.mutateAsync(inv.id)
                  toast.success(t('inbox.declined'))
                } catch (e) {
                  toastError(e)
                }
              }}
            >
              <X className="size-4" />
              {t('inbox.decline')}
            </Button>
          </div>
        </li>
      ))}
    </ul>
  )
}

function JoinRequestsTab() {
  const { t } = useTranslation('membership')
  const list = useMyJoinRequests()
  const cancel = useCancelJoinRequest()
  const toastError = useToastError()

  if (list.isLoading) return <TableSkeleton rows={2} cols={2} />
  if (!list.data || list.data.length === 0)
    return <EmptyState title={t('inbox.noJoinRequests')} />

  return (
    <ul className="divide-y rounded-md border">
      {list.data.map((r) => (
        <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
          <span className="flex items-center gap-2">
            <span className="font-medium">{r.org_name}</span>
            <Badge variant="secondary">{r.status}</Badge>
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={async () => {
              try {
                await cancel.mutateAsync(r.id)
                toast.success(t('inbox.cancelled'))
              } catch (e) {
                toastError(e)
              }
            }}
          >
            {t('inbox.cancel')}
          </Button>
        </li>
      ))}
    </ul>
  )
}

function DiscoverTab() {
  const { t } = useTranslation('membership')
  const [q, setQ] = useState('')
  const debounced = useDebounce(q, 250)
  const list = useDiscoverable(debounced)
  const requestJoin = useRequestJoin()
  const toastError = useToastError()

  return (
    <div className="space-y-3">
      <Input
        className="max-w-sm"
        placeholder={t('discover.search')}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {list.isLoading ? (
        <TableSkeleton rows={2} cols={2} />
      ) : list.data && list.data.length > 0 ? (
        <ul className="divide-y rounded-md border">
          {list.data.map((o) => (
            <li
              key={o.id}
              className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
            >
              <span className="flex items-center gap-2">
                <span className="font-medium">{o.name}</span>
                <span className="text-muted-foreground font-mono text-xs">{o.slug}</span>
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={requestJoin.isPending}
                onClick={async () => {
                  try {
                    await requestJoin.mutateAsync({ orgId: o.id })
                    toast.success(t('discover.requested'))
                  } catch (e) {
                    toastError(e)
                  }
                }}
              >
                {requestJoin.isPending && <Loader2 className="size-4 animate-spin" />}
                {t('discover.request')}
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title={t('discover.empty')} />
      )}
    </div>
  )
}

export function InboxPage() {
  const { t } = useTranslation('membership')
  return (
    <div>
      <PageHeader title={t('inbox.title')} description={t('inbox.subtitle')} />
      <Tabs defaultValue="invitations">
        <TabsList>
          <TabsTrigger value="invitations">{t('inbox.tabInvitations')}</TabsTrigger>
          <TabsTrigger value="requests">{t('inbox.tabJoinRequests')}</TabsTrigger>
          <TabsTrigger value="discover">{t('inbox.tabDiscover')}</TabsTrigger>
        </TabsList>
        <TabsContent value="invitations" className="pt-4">
          <InvitationsTab />
        </TabsContent>
        <TabsContent value="requests" className="pt-4">
          <JoinRequestsTab />
        </TabsContent>
        <TabsContent value="discover" className="pt-4">
          <DiscoverTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
