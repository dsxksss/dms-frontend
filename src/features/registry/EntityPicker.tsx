import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useEntities, useEntityTypes } from '@/hooks/use-registry'
import { shortId } from '@/lib/format'
import type { Entity } from '@/api/registry'

export function entityLabel(e: Entity): string {
  const name = e.data?.name ?? e.data?.key
  return typeof name === 'string' && name ? name : shortId(e.id)
}

/** 选引用实体：先选类型，再选该类型下的实体。返回实体 id。 */
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
  const entities = useEntities(projectId, { type: typeId, limit: 100 }, !!typeId)

  const options = (entities.data?.items ?? []).filter((e) => e.id !== excludeId)

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
