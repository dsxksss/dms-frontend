import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useEntityTypes, useRecords } from '@/hooks/use-registry'
import { shortId } from '@/lib/format'
import { EntityDialog } from './EntityDialog'

/** 选择一条药物资产记录（reference 字段 / 关系目标）；支持内嵌新建目标记录后自动选中。 */
export function EntityPicker({
  projectId,
  value,
  onChange,
  refType,
}: {
  projectId: string
  value: string | null
  onChange: (id: string | null) => void
  /** 字段的 ref_type（目标资产类型 key）：给定时锁定到该类型，仅列其记录。 */
  refType?: string | null
}) {
  const { t } = useTranslation('registry')
  const types = useEntityTypes(projectId)
  const assetTypes = (types.data ?? []).filter((ty) => ty.kind === 'asset')
  // ref_type 指定时锁定目标类型（按 key 匹配），否则用户手选类型。
  const lockedType = refType
    ? assetTypes.find((ty) => ty.key === refType)
    : undefined
  const [pickedTypeId, setPickedTypeId] = useState('')
  const targetType = refType
    ? lockedType
    : assetTypes.find((ty) => ty.id === pickedTypeId)
  const typeId = targetType?.id ?? ''
  const records = useRecords(
    projectId,
    'asset',
    { type: typeId, limit: 50 },
    !!typeId,
  )
  const [createOpen, setCreateOpen] = useState(false)

  const label = (data: Record<string, unknown>, id: string) =>
    String(data.name ?? data.id ?? shortId(id))

  return (
    <div className="flex items-center gap-2">
      {refType ? (
        <div className="flex h-9 w-[34%] shrink-0 items-center truncate rounded-[8px] border border-input bg-muted px-3 text-[13px] text-muted-foreground">
          {lockedType?.name ?? refType}
        </div>
      ) : (
        <Select value={pickedTypeId} onValueChange={setPickedTypeId}>
          <SelectTrigger className="w-[34%] shrink-0">
            <SelectValue placeholder={t('picker.type')} />
          </SelectTrigger>
          <SelectContent>
            {assetTypes.map((ty) => (
              <SelectItem key={ty.id} value={ty.id}>
                {ty.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Select
        value={value ?? ''}
        onValueChange={(v) => onChange(v || null)}
        disabled={!typeId}
      >
        <SelectTrigger className="min-w-0 flex-1">
          <SelectValue placeholder={t('picker.entity')} />
        </SelectTrigger>
        <SelectContent>
          {(records.data?.items ?? []).map((r) => (
            <SelectItem key={r.id} value={r.id}>
              {label(r.data, r.id)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 内嵌新建目标记录：免去先退出去建好再回来 */}
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="shrink-0"
        disabled={!targetType}
        title={
          targetType
            ? t('picker.createNew', { type: targetType.name })
            : t('picker.createNew', { type: '' })
        }
        onClick={() => setCreateOpen(true)}
      >
        <Plus className="size-4" />
      </Button>

      {targetType && (
        <EntityDialog
          projectId={projectId}
          kind="asset"
          type={targetType}
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={(e) => onChange(e.id)}
        />
      )}
    </div>
  )
}
