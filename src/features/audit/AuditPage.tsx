import { useState, type ComponentType } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Activity,
  Eye,
  KeyRound,
  Loader2,
  Pencil,
  PenLine,
  Plus,
  Trash2,
} from 'lucide-react'

import { PageHeader } from '@/components/page-header'
import { EmptyState, ErrorState } from '@/components/states'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { UserPicker } from '@/features/membership/UserPicker'
import { ChangesView } from '@/features/audit/ChangesView'
import { useAudit } from '@/hooks/use-audit'
import { shortId, formatDateTime } from '@/lib/format'
import type { Tone } from '@/lib/tone'
import type { AuditEntry } from '@/api/audit'
import type { UserCard } from '@/api/membership'

const ENTITY_TYPES = [
  'project',
  'dataset',
  'entity',
  'entity_type',
  'file',
  'protocol',
  'run',
  'signature',
  'organization',
  'team',
]
const ALL = '__all'

/** 审计动作 → 图标 + tone（按 action 关键字归类）。 */
function actionMeta(action: string): {
  tone: Tone
  Icon: ComponentType<{ className?: string }>
} {
  const a = action.toLowerCase()
  if (a.includes('creat') || a.includes('add') || a.includes('invit'))
    return { tone: 'success', Icon: Plus }
  if (a.includes('delet') || a.includes('remov') || a.includes('revok'))
    return { tone: 'danger', Icon: Trash2 }
  if (a.includes('sign')) return { tone: 'purple', Icon: PenLine }
  if (a.includes('grant') || a.includes('share') || a.includes('permission'))
    return { tone: 'info', Icon: KeyRound }
  if (a.includes('updat') || a.includes('patch') || a.includes('chang'))
    return { tone: 'warning', Icon: Pencil }
  return { tone: 'neutral', Icon: Activity }
}

const TONE_TILE: Record<Tone, string> = {
  success: 'bg-[#E7F6EC] text-[#15803D]',
  warning: 'bg-[#FEF4E6] text-[#B45309]',
  info: 'bg-[#EAF0FF] text-[#2F6BFF]',
  danger: 'bg-[#FDECEC] text-[#B91C1C]',
  neutral: 'bg-[#EEF0F3] text-[#64748B]',
  purple: 'bg-[#EFE9FB] text-[#6D5BD0]',
  pink: 'bg-[#FBEAF2] text-[#BE185D]',
  lock: 'bg-[#FFF3F0] text-[#E0492C]',
}

export function AuditPage() {
  const { t } = useTranslation('audit')
  const [entityType, setEntityType] = useState('')
  const [actorUser, setActorUser] = useState<UserCard[]>([])
  const [filters, setFilters] = useState({ entity_type: '', actor_id: '' })
  const [page, setPage] = useState({ limit: 20, offset: 0 })
  const [changesOf, setChangesOf] = useState<AuditEntry | null>(null)

  const query = useAudit({
    entity_type: filters.entity_type || undefined,
    actor_id: filters.actor_id || undefined,
    ...page,
  })

  const items = query.data?.items ?? []
  const total = query.data?.total ?? 0
  const hasMore = page.offset + items.length < total

  return (
    <div className="mx-auto max-w-[920px]">
      <PageHeader title={t('title')} description={t('subtitle')} />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label>{t('filters.entityType')}</Label>
          <Select
            value={entityType || ALL}
            onValueChange={(v) => setEntityType(v === ALL ? '' : v)}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('filters.entityTypeAll')}</SelectItem>
              {ENTITY_TYPES.map((et) => (
                <SelectItem key={et} value={et}>
                  {t(`entityTypes.${et}`, et)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-64 space-y-1.5">
          <Label>{t('filters.actor')}</Label>
          <UserPicker value={actorUser} onChange={setActorUser} max={1} />
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setFilters({
              entity_type: entityType,
              actor_id: actorUser[0]?.id ?? '',
            })
            setPage((p) => ({ ...p, offset: 0 }))
          }}
        >
          {t('filters.apply')}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setEntityType('')
            setActorUser([])
            setFilters({ entity_type: '', actor_id: '' })
            setPage((p) => ({ ...p, offset: 0 }))
          }}
        >
          {t('filters.clear')}
        </Button>
      </div>

      {query.isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="text-muted-foreground size-6 animate-spin" />
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState title={t('empty')} />
      ) : (
        <>
          <Card className="gap-0 py-1.5">
            {items.map((e) => {
              const { tone, Icon } = actionMeta(e.action)
              return (
                <div
                  key={e.id}
                  className="border-divider flex gap-3.5 border-b px-5 py-3.5 last:border-0"
                >
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-[9px] ${TONE_TILE[tone]}`}
                  >
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px]">
                      <b>{e.user_name ?? t('none')}</b>{' '}
                      <span className="text-[#5a6473]">
                        {e.event_description ?? e.action}
                      </span>{' '}
                      <span className="text-brand font-mono text-[11.5px]">
                        {e.entity_type} {shortId(e.entity_id)}
                      </span>
                    </div>
                    <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px]">
                      <span>{formatDateTime(e.occurred_at)}</span>
                      {e.ip_address && (
                        <span className="font-mono">IP {e.ip_address}</span>
                      )}
                      {e.request_id && (
                        <span className="font-mono">{e.request_id}</span>
                      )}
                      {e.parent_type && (
                        <span>
                          ↳ {e.parent_type} {shortId(e.parent_id)}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge variant={tone} className="h-fit">
                    {e.action}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="h-fit"
                    aria-label={t('viewChanges')}
                    onClick={() => setChangesOf(e)}
                  >
                    <Eye className="size-4" />
                  </Button>
                </div>
              )
            })}
          </Card>

          {(page.offset > 0 || hasMore) && (
            <div className="mt-5 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page.offset === 0}
                onClick={() =>
                  setPage((p) => ({
                    ...p,
                    offset: Math.max(0, p.offset - p.limit),
                  }))
                }
              >
                {t('table.prev', { ns: 'common' })}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!hasMore}
                onClick={() =>
                  setPage((p) => ({ ...p, offset: p.offset + p.limit }))
                }
              >
                {t('table.next', { ns: 'common' })}
              </Button>
            </div>
          )}
        </>
      )}

      <Dialog open={!!changesOf} onOpenChange={(o) => !o && setChangesOf(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('changesTitle')}</DialogTitle>
          </DialogHeader>
          <ChangesView changes={changesOf?.changes} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
