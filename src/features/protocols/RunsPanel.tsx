import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Play } from 'lucide-react'

import { EmptyState, ErrorState } from '@/components/states'
import { UserName } from '@/components/user-name'
import { UserAvatar } from '@/components/user-avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Check } from 'lucide-react'
import { useProjectRole } from '@/hooks/use-projects'
import { useProtocols, useRuns } from '@/hooks/use-protocols'
import { useSignatures } from '@/hooks/use-signatures'
import { roleAtLeast } from '@/lib/roles'
import { statusTone } from '@/lib/tone'
import { cn } from '@/lib/utils'
import type { RunStatus } from '@/api/protocols'
import { StartRunDialog } from './StartRunDialog'
import { RunDetailDialog } from './RunDetailDialog'

const STATUSES: RunStatus[] = ['draft', 'in_progress', 'completed', 'aborted']
const COLS = 'grid-cols-[1.3fr_1.1fr_160px_110px_100px]'

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
  const sigs = useSignatures(projectId, { target_kind: 'run', limit: 200 })
  const signedRuns = new Set(sigs.data?.items.map((s) => s.target_id) ?? [])

  const [startOpen, setStartOpen] = useState(false)
  const [openRun, setOpenRun] = useState<string | null>(null)

  const items = query.data?.items ?? []
  const total = query.data?.total ?? 0
  const hasMore = page.offset + items.length < total

  const startBtn = canContribute && (
    <Button onClick={() => setStartOpen(true)}>
      <Play className="size-4" />
      {t('run.start')}
    </Button>
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
        {startBtn}
      </div>

      {query.isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="text-muted-foreground size-6 animate-spin" />
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          title={t('run.empty')}
          description={t('run.emptyDesc')}
          action={startBtn || undefined}
        />
      ) : (
        <>
          <Card className="gap-0 overflow-hidden py-0">
            <div className="overflow-x-auto">
              <div className="min-w-[740px]">
                <div
                  className={cn(
                    'bg-surface-2 text-muted-foreground grid gap-2 border-b px-[18px] py-2.5 text-[11px] font-semibold tracking-[0.04em] uppercase',
                    COLS,
                  )}
                >
                  <div>{t('columns.name')}</div>
                  <div>{t('columns.protocol')}</div>
                  <div>{t('columns.performedBy')}</div>
                  <div>{t('columns.status')}</div>
                  <div>{t('columns.signature')}</div>
                </div>
                {items.map((r) => (
                  <div
                    key={r.id}
                    className={cn(
                      'border-divider hover:bg-row-hover grid cursor-pointer items-center gap-2 border-b px-[18px] py-3 text-[13px] last:border-b-0',
                      COLS,
                    )}
                    onClick={() => setOpenRun(r.id)}
                  >
                    <span className="truncate font-semibold">{r.name}</span>
                    <span className="truncate text-[#5a6473]">
                      {protoName[r.protocol_id] ?? '-'}
                    </span>
                    <span className="flex min-w-0 items-center gap-2">
                      <UserAvatar seed={r.performed_by ?? '?'} className="size-6" />
                      <UserName
                        id={r.performed_by ?? ''}
                        className="truncate text-[12.5px]"
                      />
                    </span>
                    <span>
                      <Badge variant={statusTone(r.status)}>
                        {t(`status.${r.status}`)}
                      </Badge>
                    </span>
                    <span>
                      {signedRuns.has(r.id) ? (
                        <Badge variant="success">
                          <Check className="size-3" />
                          {t('run.signed')}
                        </Badge>
                      ) : (
                        <span className="text-[#aeb6c2]">—</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
          {(page.offset > 0 || hasMore) && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page.offset === 0}
                onClick={() =>
                  setPage((p) => ({ ...p, offset: Math.max(0, p.offset - p.limit) }))
                }
              >
                {t('table.prev', { ns: 'common' })}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!hasMore}
                onClick={() => setPage((p) => ({ ...p, offset: p.offset + p.limit }))}
              >
                {t('table.next', { ns: 'common' })}
              </Button>
            </div>
          )}
        </>
      )}

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
