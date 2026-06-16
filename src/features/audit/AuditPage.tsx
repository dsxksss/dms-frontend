import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ColumnDef } from '@tanstack/react-table'
import { Eye } from 'lucide-react'

import { PageHeader } from '@/components/page-header'
import { DataTable } from '@/components/data-table'
import { EmptyState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAudit } from '@/hooks/use-audit'
import { shortId, formatDateTime } from '@/lib/format'
import type { AuditEntry } from '@/api/audit'

export function AuditPage() {
  const { t } = useTranslation('audit')
  const [draft, setDraft] = useState({ entity_type: '', actor_id: '' })
  const [filters, setFilters] = useState({ entity_type: '', actor_id: '' })
  const [page, setPage] = useState({ limit: 20, offset: 0 })
  const [changesOf, setChangesOf] = useState<AuditEntry | null>(null)

  const query = useAudit({
    entity_type: filters.entity_type || undefined,
    actor_id: filters.actor_id || undefined,
    ...page,
  })

  const columns = useMemo<ColumnDef<AuditEntry, unknown>[]>(
    () => [
      {
        id: 'time',
        header: t('columns.time'),
        cell: ({ row }) => (
          <span className="text-muted-foreground whitespace-nowrap text-xs tabular-nums">
            {formatDateTime(row.original.occurred_at)}
          </span>
        ),
      },
      {
        id: 'user',
        header: t('columns.user'),
        cell: ({ row }) => {
          const e = row.original
          return (
            <div className="flex flex-col">
              <span className="text-sm">{e.user_name ?? t('none')}</span>
              {e.user_handle && (
                <span className="text-muted-foreground font-mono text-xs">
                  {e.user_handle}
                </span>
              )}
            </div>
          )
        },
      },
      {
        id: 'ip',
        header: t('columns.ip'),
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.ip_address ?? t('none')}</span>
        ),
      },
      {
        id: 'action',
        header: t('columns.action'),
        cell: ({ row }) => <Badge variant="secondary">{row.original.action}</Badge>,
      },
      {
        id: 'event',
        header: t('columns.event'),
        cell: ({ row }) => (
          <span className="text-sm">{row.original.event_description ?? t('none')}</span>
        ),
      },
      {
        id: 'entity',
        header: t('columns.entity'),
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-sm">{row.original.entity_type}</span>
            <span className="text-muted-foreground font-mono text-xs">
              {shortId(row.original.entity_id)}
            </span>
            {row.original.parent_type && (
              <span className="text-muted-foreground text-xs">
                ↳ {row.original.parent_type} {shortId(row.original.parent_id)}
              </span>
            )}
          </div>
        ),
      },
      {
        id: 'changes',
        header: t('columns.changes'),
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setChangesOf(row.original)}
          >
            <Eye className="size-4" />
            {t('viewChanges')}
          </Button>
        ),
      },
    ],
    [t],
  )

  return (
    <div>
      <PageHeader title={t('title')} description={t('subtitle')} />

      <div className="flex flex-wrap items-end gap-3 pb-3">
        <div className="space-y-1.5">
          <Label htmlFor="etype">{t('filters.entityType')}</Label>
          <Input
            id="etype"
            className="w-48"
            placeholder={t('filters.entityTypePlaceholder')}
            value={draft.entity_type}
            onChange={(e) => setDraft((d) => ({ ...d, entity_type: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="actor">{t('filters.actor')}</Label>
          <Input
            id="actor"
            className="w-64"
            placeholder={t('filters.actorPlaceholder')}
            value={draft.actor_id}
            onChange={(e) => setDraft((d) => ({ ...d, actor_id: e.target.value }))}
          />
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setFilters(draft)
            setPage((p) => ({ ...p, offset: 0 }))
          }}
        >
          {t('filters.apply')}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setDraft({ entity_type: '', actor_id: '' })
            setFilters({ entity_type: '', actor_id: '' })
            setPage((p) => ({ ...p, offset: 0 }))
          }}
        >
          {t('filters.clear')}
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={query.data?.items ?? []}
        loading={query.isLoading}
        error={query.isError ? query.error : undefined}
        onRetry={() => query.refetch()}
        empty={<EmptyState title={t('empty')} />}
        pagination={{
          limit: page.limit,
          offset: page.offset,
          total: query.data?.total ?? 0,
          onChange: setPage,
        }}
      />

      <Dialog open={!!changesOf} onOpenChange={(o) => !o && setChangesOf(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('changesTitle')}</DialogTitle>
          </DialogHeader>
          <pre className="bg-muted max-h-[60vh] overflow-auto rounded-md p-3 text-xs">
            {JSON.stringify(changesOf?.changes ?? {}, null, 2)}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  )
}
