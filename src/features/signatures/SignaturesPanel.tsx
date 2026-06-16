import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ColumnDef } from '@tanstack/react-table'

import { DataTable } from '@/components/data-table'
import { EmptyState } from '@/components/states'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useSignatures } from '@/hooks/use-signatures'
import { shortId, formatDateTime } from '@/lib/format'
import type { Signature } from '@/api/signatures'

const TARGET_KINDS = ['run', 'dataset', 'entity', 'file', 'protocol']

export function SignaturesPanel({ projectId }: { projectId: string }) {
  const { t } = useTranslation('signatures')
  const [kind, setKind] = useState('')
  const [page, setPage] = useState({ limit: 20, offset: 0 })
  const query = useSignatures(projectId, {
    target_kind: kind || undefined,
    ...page,
  })

  const columns = useMemo<ColumnDef<Signature, unknown>[]>(
    () => [
      {
        accessorKey: 'signer_name',
        header: t('columns.signer'),
        cell: ({ row }) => (
          <span className="text-sm font-medium">{row.original.signer_name}</span>
        ),
      },
      {
        accessorKey: 'meaning',
        header: t('columns.meaning'),
        cell: ({ row }) => (
          <Badge variant="secondary">{t(`meaning.${row.original.meaning}`)}</Badge>
        ),
      },
      {
        accessorKey: 'reason',
        header: t('columns.reason'),
        cell: ({ row }) => (
          <span className="block max-w-[28ch] truncate text-sm" title={row.original.reason}>
            {row.original.reason || '-'}
          </span>
        ),
      },
      {
        id: 'target',
        header: t('columns.target'),
        cell: ({ row }) => (
          <span className="flex items-center gap-1.5 text-sm">
            <Badge variant="outline">
              {t(`targetKind.${row.original.target_kind}`, row.original.target_kind)}
            </Badge>
            <span className="font-mono text-xs">{shortId(row.original.target_id)}</span>
          </span>
        ),
      },
      {
        accessorKey: 'signed_at',
        header: t('columns.signedAt'),
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs tabular-nums">
            {formatDateTime(row.original.signed_at)}
          </span>
        ),
      },
      {
        accessorKey: 'content_hash',
        header: t('columns.hash'),
        cell: ({ row }) => (
          <span className="text-muted-foreground font-mono text-xs" title={row.original.content_hash}>
            {row.original.content_hash.slice(0, 12)}
          </span>
        ),
      },
    ],
    [t],
  )

  return (
    <div className="space-y-4">
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

      <DataTable
        columns={columns}
        data={query.data?.items ?? []}
        loading={query.isLoading}
        error={query.isError ? query.error : undefined}
        onRetry={() => query.refetch()}
        empty={<EmptyState title={t('empty')} description={t('subtitle')} />}
        pagination={{
          limit: page.limit,
          offset: page.offset,
          total: query.data?.total ?? 0,
          onChange: setPage,
        }}
      />
    </div>
  )
}
