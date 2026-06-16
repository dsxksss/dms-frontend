import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ColumnDef } from '@tanstack/react-table'
import { Play } from 'lucide-react'

import { DataTable } from '@/components/data-table'
import { EmptyState } from '@/components/states'
import { UserName } from '@/components/user-name'
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
import { useProjectRole } from '@/hooks/use-projects'
import { useProtocols, useRuns } from '@/hooks/use-protocols'
import { roleAtLeast } from '@/lib/roles'
import { formatDateTime } from '@/lib/format'
import type { Run, RunStatus } from '@/api/protocols'
import { StartRunDialog } from './StartRunDialog'
import { RunDetailDialog } from './RunDetailDialog'

const STATUSES: RunStatus[] = ['draft', 'in_progress', 'completed', 'aborted']
const STATUS_CLASS: Record<RunStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  in_progress: 'bg-brand/15 text-brand border-transparent',
  completed: 'bg-success/15 text-success border-transparent',
  aborted: 'bg-destructive/15 text-destructive border-transparent',
}

export function RunsPanel({ projectId }: { projectId: string }) {
  const { t } = useTranslation('protocols')
  const role = useProjectRole(projectId)
  const canContribute = roleAtLeast(role, 'contributor')

  const [status, setStatus] = useState('')
  const [page, setPage] = useState({ limit: 20, offset: 0 })
  const query = useRuns(projectId, { status: status || undefined, ...page })
  const protocols = useProtocols(projectId, { include_archived: true, limit: 100 })
  const protoName = useMemo(
    () => Object.fromEntries((protocols.data?.items ?? []).map((p) => [p.id, p.name])),
    [protocols.data],
  )

  const [startOpen, setStartOpen] = useState(false)
  const [openRun, setOpenRun] = useState<string | null>(null)

  const columns = useMemo<ColumnDef<Run, unknown>[]>(
    () => [
      {
        accessorKey: 'name',
        header: t('columns.name'),
        cell: ({ row }) => (
          <button
            className="hover:text-brand text-left font-medium hover:underline"
            onClick={() => setOpenRun(row.original.id)}
          >
            {row.original.name}
          </button>
        ),
      },
      {
        accessorKey: 'protocol_id',
        header: t('columns.protocol'),
        cell: ({ row }) => (
          <span className="text-sm">
            {protoName[row.original.protocol_id] ?? '-'}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: t('columns.status'),
        cell: ({ row }) => (
          <Badge className={STATUS_CLASS[row.original.status]}>
            {t(`status.${row.original.status}`)}
          </Badge>
        ),
      },
      {
        accessorKey: 'performed_by',
        header: t('columns.performedBy'),
        cell: ({ row }) => <UserName id={row.original.performed_by} className="text-sm" />,
      },
      {
        accessorKey: 'started_at',
        header: t('columns.started'),
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs tabular-nums">
            {formatDateTime(row.original.started_at)}
          </span>
        ),
      },
    ],
    [t, protoName],
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5">
          <Label>{t('run.filterStatus')}</Label>
          <Select
            value={status || 'all'}
            onValueChange={(v) => {
              setStatus(v === 'all' ? '' : v)
              setPage((p) => ({ ...p, offset: 0 }))
            }}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('run.allStatus')}</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`status.${s}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {canContribute && (
          <Button onClick={() => setStartOpen(true)}>
            <Play className="size-4" />
            {t('run.start')}
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={query.data?.items ?? []}
        loading={query.isLoading}
        error={query.isError ? query.error : undefined}
        onRetry={() => query.refetch()}
        empty={
          <EmptyState
            title={t('run.empty')}
            description={t('run.emptyDesc')}
            action={
              canContribute ? (
                <Button onClick={() => setStartOpen(true)}>
                  <Play className="size-4" />
                  {t('run.start')}
                </Button>
              ) : undefined
            }
          />
        }
        pagination={{
          limit: page.limit,
          offset: page.offset,
          total: query.data?.total ?? 0,
          onChange: setPage,
        }}
      />

      <StartRunDialog
        projectId={projectId}
        open={startOpen}
        onOpenChange={setStartOpen}
        onStarted={(run) => setOpenRun(run.id)}
      />
      {openRun && (
        <RunDetailDialog
          projectId={projectId}
          runId={openRun}
          open={!!openRun}
          onOpenChange={(o) => !o && setOpenRun(null)}
        />
      )}
    </div>
  )
}
