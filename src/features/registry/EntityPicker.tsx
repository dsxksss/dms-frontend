import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useEntityTypes, useRecords } from '@/hooks/use-registry'
import { shortId } from '@/lib/format'

/** 选择一条药物资产记录（reference 字段 / 关系目标）。 */
export function EntityPicker({
  projectId,
  value,
  onChange,
}: {
  projectId: string
  value: string | null
  onChange: (id: string | null) => void
}) {
  const { t } = useTranslation('registry')
  const types = useEntityTypes(projectId)
  const assetTypes = (types.data ?? []).filter((ty) => ty.kind === 'asset')
  const [typeId, setTypeId] = useState('')
  const records = useRecords(
    projectId,
    'asset',
    { type: typeId, limit: 50 },
    !!typeId,
  )

  const label = (data: Record<string, unknown>, id: string) =>
    String(data.name ?? data.id ?? shortId(id))

  return (
    <div className="grid grid-cols-2 gap-2">
      <Select value={typeId} onValueChange={setTypeId}>
        <SelectTrigger className="w-full">
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
      <Select
        value={value ?? ''}
        onValueChange={(v) => onChange(v || null)}
        disabled={!typeId}
      >
        <SelectTrigger className="w-full">
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
    </div>
  )
}
