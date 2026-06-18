import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, Loader2 } from 'lucide-react'

import { EmptyState, ErrorState } from '@/components/states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { UserAvatar } from '@/components/user-avatar'
import { useToastError } from '@/hooks/use-toast-error'
import { signaturesApi } from '@/api/signatures'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useSignatures } from '@/hooks/use-signatures'
import { shortId, formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'

const TARGET_KINDS = ['run', 'dataset', 'entity', 'file', 'protocol']
const COLS = 'grid-cols-[1.3fr_110px_190px_140px_110px]'

export function SignaturesPanel({ projectId }: { projectId: string }) {
  const { t } = useTranslation('signatures')
  const toastError = useToastError()
  const [kind, setKind] = useState('')
  const [page, setPage] = useState({ limit: 20, offset: 0 })
  const query = useSignatures(projectId, {
    target_kind: kind || undefined,
    ...page,
  })

  const items = query.data?.items ?? []
  const total = query.data?.total ?? 0
  const hasMore = page.offset + items.length < total

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5">
          <Label>{t('filterTarget')}</Label>
          <Select
            value={kind || 'all'}
            onValueChange={(v) => {
              setKind(v === 'all' ? '' : v)
              setPage((p) => ({ ...p, offset: 0 }))
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allTargets')}</SelectItem>
              {TARGET_KINDS.map((k) => (
                <SelectItem key={k} value={k}>
                  {t(`targetKind.${k}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          onClick={() =>
            signaturesApi
              .exportCsv(projectId, { target_kind: kind || undefined })
              .catch(toastError)
          }
        >
          <Download className="size-4" />
          {t('export')}
        </Button>
      </div>

      {query.isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="text-muted-foreground size-6 animate-spin" />
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState title={t('empty')} description={t('subtitle')} />
      ) : (
        <>
          <Card className="gap-0 overflow-hidden py-0">
            <div className="overflow-x-auto">
              <div className="min-w-[760px]">
                <div
                  className={cn(
                    'bg-surface-2 text-muted-foreground grid gap-2 border-b px-[18px] py-2.5 text-[11px] font-semibold tracking-[0.04em] uppercase',
                    COLS,
                  )}
                >
                  <div>{t('columns.signer')}</div>
                  <div>{t('columns.meaning')}</div>
                  <div>{t('columns.target')}</div>
                  <div>{t('columns.signedAt')}</div>
                  <div>{t('columns.hash')}</div>
                </div>
                {items.map((s) => (
                  <div
                    key={s.id}
                    className={cn(
                      'border-divider grid items-center gap-2 border-b px-[18px] py-3 text-[13px] last:border-b-0',
                      COLS,
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <UserAvatar
                        seed={s.signer_name}
                        initials={s.signer_name}
                        className="size-6"
                      />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">
                          {s.signer_name}
                        </span>
                        {s.reason && (
                          <span className="text-muted-foreground block truncate text-[11px]">
                            {s.reason}
                          </span>
                        )}
                      </span>
                    </span>
                    <span>
                      <Badge variant="purple">{t(`meaning.${s.meaning}`)}</Badge>
                    </span>
                    <span className="flex min-w-0 items-center gap-1.5">
                      <Badge variant="neutral">
                        {t(`targetKind.${s.target_kind}`, s.target_kind)}
                      </Badge>
                      <span className="text-brand truncate font-mono text-[11px]">
                        {shortId(s.target_id)}
                      </span>
                    </span>
                    <span className="text-muted-foreground text-[11px] tabular-nums">
                      {formatDateTime(s.signed_at)}
                    </span>
                    <span
                      className="text-muted-foreground truncate font-mono text-[11px]"
                      title={s.content_hash}
                    >
                      {s.content_hash.slice(0, 12)}
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
    </div>
  )
}
