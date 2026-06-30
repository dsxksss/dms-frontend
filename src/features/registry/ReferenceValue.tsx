import { useTranslation } from 'react-i18next'
import { useQueries } from '@tanstack/react-query'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { cn } from '@/lib/utils'
import { shortId } from '@/lib/format'
import { useEntityTypes } from '@/hooks/use-registry'
import { registryApi } from '@/api/registry'
import { fieldDisplayName } from '@/api/registry'
import type { Entity, EntityType, FieldDef } from '@/api/registry'
import { MaskedValue } from './MaskedValue'

/** 一个引用字段解析后的目标记录信息（含权限脱敏所需的 locked 字段）。 */
export interface RefResolved {
  /** 目标记录展示名（解析不到时退回短 id）。 */
  name: string
  /** 目标资产类型（用于渲染字段卡片）；解析不到为 undefined。 */
  type?: EntityType
  /** 目标记录（其敏感值已由后端按当前用户授权脱敏）。 */
  record?: Entity
  /** 目标类型对当前用户锁定（脱敏）的字段。 */
  locked: Set<string>
}

/**
 * 引用解析器：给定一组字段，预取其中 reference 字段目标类型的记录与字段授权，
 * 返回 `resolve(field, value)`。**权限**：目标记录走与列表同一条已鉴权的 listRecords，
 * 敏感值已被后端按当前用户脱敏；locked 仅用于渲染「••••」占位。
 */
export function useRefResolver(projectId: string, fields: FieldDef[]) {
  const allTypes = useEntityTypes(projectId)

  const typeIdByKey = new Map<string, string>()
  const typeById = new Map<string, EntityType>()
  for (const ty of allTypes.data ?? []) {
    typeIdByKey.set(ty.key, ty.id)
    typeById.set(ty.id, ty)
  }

  const refTypeIds = Array.from(
    new Set(
      fields
        .filter((f) => f.type === 'reference' && f.ref_type)
        .map((f) => typeIdByKey.get(f.ref_type as string))
        .filter((id): id is string => Boolean(id)),
    ),
  )

  const recordQs = useQueries({
    queries: refTypeIds.map((id) => ({
      queryKey: ['registry', projectId, 'ref-records', id],
      queryFn: () => registryApi.listRecords(projectId, 'asset', { type: id, limit: 500 }),
      staleTime: 30_000,
    })),
  })
  const accessQs = useQueries({
    queries: refTypeIds.map((id) => ({
      queryKey: ['registry', projectId, 'ref-access', id],
      queryFn: () => registryApi.myFieldAccess(projectId, 'asset', id),
      staleTime: 60_000,
    })),
  })

  const recordById = new Map<string, Entity>()
  for (const q of recordQs)
    for (const r of q.data?.items ?? []) recordById.set(r.id, r)

  const lockedByType = new Map<string, Set<string>>()
  refTypeIds.forEach((id, i) =>
    lockedByType.set(id, new Set(accessQs[i]?.data?.locked_fields ?? [])),
  )

  const resolve = (field: FieldDef, value: unknown): RefResolved | null => {
    if (field.type !== 'reference' || !field.ref_type) return null
    if (value == null || value === '') return null
    const id = String(value)
    const typeId = typeIdByKey.get(field.ref_type)
    const record = recordById.get(id)
    return {
      name: record ? String(record.data.name ?? shortId(id)) : shortId(id),
      type: typeId ? typeById.get(typeId) : undefined,
      record,
      locked: (typeId && lockedByType.get(typeId)) || new Set<string>(),
    }
  }

  return resolve
}

/** 悬浮卡片内容：被引用记录的字段一览（锁定字段脱敏）。 */
function ReferenceCard({
  type,
  record,
  locked,
}: {
  type: EntityType
  record: Entity
  locked: Set<string>
}) {
  const { t, i18n } = useTranslation('registry')
  const data = record.data
  const name = String(data.name ?? shortId(record.id))
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 border-b border-divider pb-2">
        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{name}</span>
        <span className="shrink-0 rounded bg-surface-2 px-1.5 py-px text-[11px] text-muted-foreground">
          {type.name}
        </span>
      </div>
      <div className="max-h-[260px] space-y-1 overflow-auto">
        {type.fields.map((f) => {
          const v = data[f.name]
          const isLocked = locked.has(f.name)
          return (
            <div key={f.name} className="flex gap-2 text-[12px]">
              <span className="w-[92px] shrink-0 truncate text-muted-foreground">
                {fieldDisplayName(f, i18n.language)}
              </span>
              <span className="min-w-0 flex-1 break-all">
                {isLocked ? (
                  <MaskedValue />
                ) : v == null || v === '' ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  <span className={cn(f.type === 'sequence' && 'mono text-[11px]')}>
                    {String(v)}
                  </span>
                )}
              </span>
            </div>
          )
        })}
        {type.fields.length === 0 && (
          <span className="text-[12px] text-muted-foreground">
            {t('entities.empty')}
          </span>
        )}
      </div>
    </div>
  )
}

/**
 * 引用字段的展示：名称为主体，悬浮显示目标记录卡片（可解析到目标记录时）。
 * 解析不到（被删/无权）则仅显示名称/短 id，不弹卡片。
 */
export function ReferenceValue({
  resolved,
  className,
}: {
  resolved: RefResolved
  className?: string
}) {
  if (!resolved.type || !resolved.record) {
    return (
      <span className={cn('font-medium text-brand', className)}>{resolved.name}</span>
    )
  }
  return (
    <HoverCard openDelay={150} closeDelay={100}>
      <HoverCardTrigger asChild>
        <span
          className={cn(
            'cursor-default font-medium text-brand underline decoration-dotted underline-offset-2',
            className,
          )}
        >
          {resolved.name}
        </span>
      </HoverCardTrigger>
      <HoverCardContent align="start" className="w-80">
        <ReferenceCard
          type={resolved.type}
          record={resolved.record}
          locked={resolved.locked}
        />
      </HoverCardContent>
    </HoverCard>
  )
}
