import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FlaskConical, Play, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, GridSkeleton } from '@/components/states'
import { useProtocols, useRuns } from '@/hooks/use-protocols'
import type { Protocol } from '@/api/protocols'
import { ProtocolDialog } from './ProtocolDialog'
import { StartRunDialog } from './StartRunDialog'

/** 方案卡片列表（2 列）：可复用模板，点开编辑或发起执行。 */
export function ProtocolsPanel({ projectId }: { projectId: string }) {
  const { t } = useTranslation('protocols')
  const query = useProtocols(projectId, { limit: 100 })
  // 一次性拉全部 run，按 protocol_id 聚合出执行次数（避免逐方案 N+1）。
  const runsQuery = useRuns(projectId, { limit: 200 })
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Protocol | null>(null)
  const [running, setRunning] = useState<Protocol | null>(null)

  const protocols = query.data?.items ?? []
  const runCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of runsQuery.data?.items ?? [])
      m.set(r.protocol_id, (m.get(r.protocol_id) ?? 0) + 1)
    return m
  }, [runsQuery.data])

  const createBtn = (
    <Button onClick={() => setCreateOpen(true)}>
      <Plus className="size-4" />
      {t('protocol.create')}
    </Button>
  )

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[18px] font-extrabold tracking-[-0.01em]">
          {t('tabs.protocols')}
        </h2>
        {createBtn}
      </div>

      {query.isLoading ? (
        <GridSkeleton count={2} columns={2} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : protocols.length === 0 ? (
        <EmptyState
          title={t('protocol.empty')}
          hint={t('protocol.emptyDesc')}
          action={createBtn}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {protocols.map((p) => (
            <div
              key={p.id}
              className="card-shadow rounded-[14px] border bg-card p-[18px]"
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => setEditing(p)}
                  className="flex min-w-0 flex-1 items-start gap-3 text-left"
                >
                  <div className="flex size-[42px] shrink-0 items-center justify-center rounded-[11px] bg-accent text-brand">
                    <FlaskConical className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-bold hover:text-brand">
                      {p.name}
                    </div>
                    <div className="mt-0.5 text-[12px] text-muted-foreground">
                      {t('protocol.stepCount', { count: p.steps.length })} ·{' '}
                      {runCounts.get(p.id) ?? 0} {t('run.section')}
                    </div>
                  </div>
                </button>
                <Button size="sm" onClick={() => setRunning(p)}>
                  <Play className="size-3.5" />
                  {t('run.start')}
                </Button>
              </div>
              {p.description && (
                <p className="mt-3 line-clamp-2 text-[12.5px] leading-relaxed text-muted-foreground">
                  {p.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <ProtocolDialog
        projectId={projectId}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
      <ProtocolDialog
        projectId={projectId}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        protocol={editing ?? undefined}
      />
      {running && (
        <StartRunDialog
          projectId={projectId}
          protocolId={running.id}
          open={!!running}
          onOpenChange={(o) => !o && setRunning(null)}
        />
      )}
    </div>
  )
}
