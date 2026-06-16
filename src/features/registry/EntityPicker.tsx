import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useEntities, useEntity, useEntityTypes } from '@/hooks/use-registry'
import { shortId } from '@/lib/format'
import type { Entity } from '@/api/registry'

export function entityLabel(e: Entity): string {
  const name = e.data?.name ?? e.data?.key
  return typeof name === 'string' && name ? name : shortId(e.id)
}

/** 选引用实体：先选类型，再选该类型下的实体。返回实体 id。已有值时回显其类型与名称。 */
export function EntityPicker({
  projectId,
  value,
  onChange,
  excludeId,
}: {
  projectId: string
  value?: string
  onChange: (entityId: string | undefined) => void
  excludeId?: string
}) {
  const { t } = useTranslation('registry')
  const types = useEntityTypes(projectId)
  const [typeId, setTypeId] = useState<string>('')

  // 回显：有值但未选类型时，拉取该实体以推断类型并显示名称。
  const valueEntity = useEntity(projectId, value ?? '', !!value && !typeId)
  useEffect(() => {
    if (value && !typeId && valueEntity.data) setTypeId(valueEntity.data.type_id)
  }, [value, typeId, valueEntity.data])

  const entities = useEntities(projectId, { type: typeId, limit: 100 }, !!typeId)

  // 合并已选实体（可能不在前 100 内）以保证回显。
  const merged = [...(entities.data?.items ?? [])]
  if (valueEntity.data && !merged.some((e) => e.id === valueEntity.data!.id)) {
    merged.unshift(valueEntity.data)
  }
  const options = merged.filter((e) => e.id !== excludeId)

  return (
    <div className="grid grid-cols-2 gap-2">
      <Select value={typeId} onValueChange={setTypeId}>
        <SelectTrigger>
          <SelectValue placeholder={t('picker.type')} />
        </SelectTrigger>
        <SelectContent>
          {(types.data ?? []).map((ty) => (
            <SelectItem key={ty.id} value={ty.id}>
              {ty.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={value ?? ''}
        onValueChange={(v) => onChange(v || undefined)}
        disabled={!typeId}
      >
        <SelectTrigger>
          <SelectValue placeholder={t('picker.entity')} />
        </SelectTrigger>
        <SelectContent>
          {options.length === 0 ? (
            <div className="text-muted-foreground px-2 py-1.5 text-sm">
              {t('picker.empty')}
            </div>
          ) : (
            options.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {entityLabel(e)}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  )
}
