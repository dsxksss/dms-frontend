import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { TableSkeleton } from '@/components/states'
import { useSignatures } from '@/hooks/use-signatures'
import { formatDateTime } from '@/lib/format'

/** 某对象上的签名（紧凑列表，用于 Run 等详情页）。 */
export function SignaturesList({
  projectId,
  targetKind,
  targetId,
}: {
  projectId: string
  targetKind: string
  targetId: string
}) {
  const { t } = useTranslation('signatures')
  const query = useSignatures(projectId, {
    target_kind: targetKind,
    target_id: targetId,
  })

  if (query.isLoading) return <TableSkeleton rows={1} cols={1} />
  const items = query.data?.items ?? []
  if (items.length === 0)
    return <p className="text-muted-foreground text-sm">{t('none')}</p>

  return (
    <ul className="divide-y rounded-md border">
      {items.map((s) => (
        <li key={s.id} className="flex items-start justify-between gap-3 px-3 py-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="secondary">{t(`meaning.${s.meaning}`)}</Badge>
              <span className="font-medium">{s.signer_name}</span>
            </div>
            {s.reason && (
              <p className="text-muted-foreground mt-0.5 text-xs">{s.reason}</p>
            )}
          </div>
          <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
            {formatDateTime(s.signed_at)}
          </span>
        </li>
      ))}
    </ul>
  )
}
