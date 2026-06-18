import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { UserAvatar } from '@/components/user-avatar'
import { useSignatures } from '@/hooks/use-signatures'
import { formatDateTime } from '@/lib/format'
import type { SignatureMeaning } from '@/api/signatures'

/** 含义 → tone：approved=绿，reviewed=蓝，authored=紫，responsibility=琥珀。 */
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

/** 某个对象上的签名紧凑列表（用于 Run / 资产详情）。 */
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
  const query = useSignatures(
    projectId,
    { target_kind: targetKind, target_id: targetId, limit: 50 },
    !!targetId,
  )
  const items = query.data?.items ?? []

  if (items.length === 0) {
    return (
      <p className="text-[12px] text-muted-foreground">{t('none')}</p>
    )
  }

  return (
    <div className="space-y-2.5">
      {items.map((s) => (
        <div key={s.id} className="flex items-center gap-2.5">
          <UserAvatar name={s.signer_name} seed={s.signer_id} size={24} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12.5px] font-semibold">
              {s.signer_name}
            </div>
            <div className="truncate text-[11px] text-muted-foreground">
              {formatDateTime(s.signed_at)}
            </div>
          </div>
          <Badge variant={meaningTone(s.meaning)}>
            {t(`meaning.${s.meaning}`)}
          </Badge>
        </div>
      ))}
    </div>
  )
}
