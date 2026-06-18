import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Activity } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageHeader } from '@/components/page-header'
import { TableCard } from '@/components/data-grid'
import { Pagination } from '@/components/pagination'
import { EmptyState, ErrorState, TableSkeleton } from '@/components/states'
import { TONE_HEX, type Tone } from '@/components/tone'
import { useAudit } from '@/hooks/use-audit'
import { formatDateTime, shortId } from '@/lib/format'
import { ChangesView } from './ChangesView'
import type { AuditEntry } from '@/api/audit'

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

const ALL = '__all__'

/** 动作动词 → tone。 */
function actionTone(action: string): Tone {
  const v = action.split('.').pop() ?? action
  if (/creat|add|grant|invit|sign|approv|restor|activat/.test(v)) {
    if (/sign/.test(v)) return 'purple'
    if (/grant|invit|approv/.test(v)) return 'info'
    if (/creat|add|restor|activat/.test(v)) return 'success'
  }
  if (/updat|edit|chang|patch|rename/.test(v)) return 'warning'
  if (/delet|remov|revok|abort|suspend|reject/.test(v)) return 'danger'
  return 'neutral'
}

export function AuditPage() {
  const { t } = useTranslation('audit')
  const [entityType, setEntityType] = useState(ALL)
  const [page, setPage] = useState({ limit: 30, offset: 0 })
  const query = useAudit({
    entity_type: entityType === ALL ? undefined : entityType,
    ...page,
  })
  const entries = query.data?.items ?? []

  return (
    <div className="mx-auto max-w-[900px] px-8 py-7">
      <PageHeader
        title={t('title')}
        titleEn="Audit"
        description={t('subtitle')}
        size="md"
        actions={
          <Select
            value={entityType}
            onValueChange={(v) => {
              setEntityType(v)
              setPage((p) => ({ ...p, offset: 0 }))
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder={t('filters.entityTypeAll')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('filters.entityTypeAll')}</SelectItem>
              {ENTITY_TYPES.map((e) => (
                <SelectItem key={e} value={e}>
                  {t(`entityTypes.${e}`, { defaultValue: e })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {query.isLoading ? (
        <TableSkeleton rows={7} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : entries.length === 0 ? (
        <EmptyState title={t('empty')} />
      ) : (
        <>
          <TableCard className="py-1.5">
            {entries.map((a) => (
              <AuditRow key={a.id} entry={a} />
            ))}
          </TableCard>
          <div className="mt-4 flex justify-end">
            <Pagination
              limit={page.limit}
              offset={page.offset}
              total={query.data?.total ?? 0}
              onChange={setPage}
            />
          </div>
        </>
      )}
    </div>
  )
}

function AuditRow({ entry }: { entry: AuditEntry }) {
  const { t } = useTranslation('audit')
  const tone = actionTone(entry.action)
  const [bg, fg] = TONE_HEX[tone]
  const verb = entry.action.split('.').pop() ?? entry.action
  const actor = entry.user_name || entry.user_handle || t('none')

  return (
    <div className="flex gap-3 border-b border-divider px-5 py-[13px] last:border-b-0">
      <div
        className="flex size-8 shrink-0 items-center justify-center rounded-[9px]"
        style={{ background: bg, color: fg }}
      >
        <Activity className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px]">
          <b>{actor}</b>{' '}
          <span className="text-[#5a6473]">
            {entry.event_description || verb}
          </span>{' '}
          <span className="mono text-[11.5px] font-semibold text-brand">
            {entry.entity_type}/{shortId(entry.entity_id)}
          </span>
        </div>
        <div className="mt-[3px] flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          <span>{formatDateTime(entry.occurred_at)}</span>
          {entry.ip_address && <span className="mono">IP {entry.ip_address}</span>}
          {entry.request_id && <span className="mono">{entry.request_id}</span>}
          <ChangesView entry={entry} />
        </div>
      </div>
      <Badge variant={tone} className="h-fit">
        {t(`actionLabels.${verb}`, { defaultValue: verb })}
      </Badge>
    </div>
  )
}
