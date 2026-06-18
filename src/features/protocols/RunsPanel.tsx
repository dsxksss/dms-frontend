import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { GridHeader, GridRow, TableCard, Th } from '@/components/data-grid'
import { EmptyState, ErrorState, TableSkeleton } from '@/components/states'
import { Pagination } from '@/components/pagination'
import { UserAvatar } from '@/components/user-avatar'
import { statusTone } from '@/components/tone'
import { useProtocols, useRuns } from '@/hooks/use-protocols'
import { useSignatures } from '@/hooks/use-signatures'
import { shortId } from '@/lib/format'
import type { Run } from '@/api/protocols'
import { RunDetailDialog } from './RunDetailDialog'

const COLS = '130px 1.4fr 1.1fr 110px 110px'

/** 执行实例表：Run / 方案 / 执行人 / 状态 / 签名。 */
export function RunsPanel({ projectId }: { projectId: string }) {
  const { t } = useTranslation('protocols')
  const [page, setPage] = useState({ limit: 30, offset: 0 })
  const query = useRuns(projectId, page)
  const protocols = useProtocols(projectId, { limit: 100 })
  // 已 approved 的 run id 集合（签名单元判定）。
  const sigs = useSignatures(projectId, { target_kind: 'run', limit: 200 })
  const [active, setActive] = useState<Run | null>(null)

  const runs = query.data?.items ?? []
  const protoName = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of protocols.data?.items ?? []) m.set(p.id, p.name)
    return m
  }, [protocols.data])
  const signed = useMemo(() => {
    const s = new Set<string>()
    for (const sig of sigs.data?.items ?? [])
      if (sig.meaning === 'approved') s.add(sig.target_id)
    return s
  }, [sigs.data])

  return (
    <div>
      {query.isLoading ? (
        <TableSkeleton rows={5} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : runs.length === 0 ? (
        <EmptyState title={t('run.empty')} hint={t('run.emptyDesc')} />
      ) : (
        <>
          <TableCard>
            <GridHeader cols={COLS}>
              <Th>Run</Th>
              <Th>{t('columns.protocol')}</Th>
              <Th>{t('columns.performedBy')}</Th>
              <Th>{t('columns.status')}</Th>
              <Th>{t('columns.signature')}</Th>
            </GridHeader>
            {runs.map((r) => (
              <GridRow key={r.id} cols={COLS} onClick={() => setActive(r)}>
                <div className="mono truncate text-[12px] font-semibold text-brand">
                  {shortId(r.id)}
                </div>
                <div className="truncate font-semibold">
                  {protoName.get(r.protocol_id) ?? r.name}
                </div>
                <div className="flex min-w-0 items-center gap-2">
                  {r.performed_by ? (
                    <>
                      <UserAvatar
                        name={r.performed_by}
                        seed={r.performed_by}
                        size={24}
                      />
                      <span className="mono truncate text-[12px] text-muted-foreground">
                        {shortId(r.performed_by)}
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
                <div>
                  <Badge variant={statusTone(r.status)}>
                    {t(`status.${r.status}`)}
                  </Badge>
                </div>
                <div>
                  {signed.has(r.id) ? (
                    <Badge variant="success">✓ {t('run.signed')}</Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
              </GridRow>
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

      {active && (
        <RunDetailDialog
          projectId={projectId}
          run={active}
          open={!!active}
          onOpenChange={(o) => !o && setActive(null)}
        />
      )}
    </div>
  )
}
