import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageHeader } from '@/components/page-header'
import { GridHeader, GridRow, TableCard, Th } from '@/components/data-grid'
import { EmptyState, ErrorState, TableSkeleton } from '@/components/states'
import { Pagination } from '@/components/pagination'
import { UserAvatar } from '@/components/user-avatar'
import { useSignatures } from '@/hooks/use-signatures'
import { useToastError } from '@/hooks/use-toast-error'
import { signaturesApi, type SignatureMeaning } from '@/api/signatures'
import { formatDateTime, shortId } from '@/lib/format'

const COLS = '1.2fr 90px 1.3fr 1fr 150px 120px'
const ALL = '__all__'
const TARGET_KINDS = [
  'run',
  'dataset',
  'entity',
  'asset_type',
  'file',
  'protocol',
]

function meaningTone(m: SignatureMeaning) {
  switch (m) {
    case 'approved':
      return 'success' as const
    case 'reviewed':
      return 'info' as const
    case 'authored':
      return 'purple' as const
    default:
      return 'warning' as const
  }
}

/** 项目电子签名审计（21 CFR Part 11）：不可改不可删。 */
export function SignaturesPanel({ projectId }: { projectId: string }) {
  const { t } = useTranslation('signatures')
  const toastError = useToastError()
  const [kind, setKind] = useState(ALL)
  const [page, setPage] = useState({ limit: 30, offset: 0 })
  const query = useSignatures(projectId, {
    target_kind: kind === ALL ? undefined : kind,
    ...page,
  })
  const items = query.data?.items ?? []

  const onExport = () =>
    signaturesApi
      .exportCsv(projectId, {
        target_kind: kind === ALL ? undefined : kind,
      })
      .catch(toastError)

  return (
    <div className="px-[26px] py-[22px] max-w-[1200px]">
      <PageHeader
        title={t('title')}
        titleEn="E-signatures"
        description={t('subtitle')}
        actions={
          <div className="flex items-center gap-2">
            <Select
              value={kind}
              onValueChange={(v) => {
                setKind(v)
                setPage((p) => ({ ...p, offset: 0 }))
              }}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder={t('allTargets')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('allTargets')}</SelectItem>
                {TARGET_KINDS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {t(`targetKind.${k}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={onExport}>
              <Download className="size-4" />
              {t('export')}
            </Button>
          </div>
        }
      />

      {query.isLoading ? (
        <TableSkeleton rows={6} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState title={t('empty')} />
      ) : (
        <>
          <TableCard>
            <GridHeader cols={COLS}>
              <Th>{t('columns.signer')}</Th>
              <Th>{t('columns.meaning')}</Th>
              <Th>{t('columns.reason')}</Th>
              <Th>{t('columns.target')}</Th>
              <Th>{t('columns.signedAt')}</Th>
              <Th>{t('columns.hash')}</Th>
            </GridHeader>
            {items.map((s) => (
              <GridRow key={s.id} cols={COLS}>
                <div className="flex min-w-0 items-center gap-2.5">
                  <UserAvatar name={s.signer_name} seed={s.signer_id} size={26} />
                  <span className="truncate font-semibold">
                    {s.signer_name}
                  </span>
                </div>
                <div>
                  <Badge variant={meaningTone(s.meaning)}>
                    {t(`meaning.${s.meaning}`)}
                  </Badge>
                </div>
                <div className="truncate text-muted-foreground" title={s.reason}>
                  {s.reason || '—'}
                </div>
                <div className="flex min-w-0 items-center gap-1.5">
                  <Badge variant="info">
                    {t(`targetKind.${s.target_kind}`, {
                      defaultValue: s.target_kind,
                    })}
                  </Badge>
                  <span className="mono truncate text-[11.5px] text-muted-foreground">
                    {shortId(s.target_id)}
                  </span>
                </div>
                <div className="text-[12px] text-muted-foreground">
                  {formatDateTime(s.signed_at)}
                </div>
                <div
                  className="mono truncate text-[11.5px] text-muted-foreground"
                  title={s.content_hash}
                >
                  {s.content_hash ? s.content_hash.slice(0, 12) : '—'}
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
    </div>
  )
}
