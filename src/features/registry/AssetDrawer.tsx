import { useTranslation } from 'react-i18next'
import { Check, GitBranch, Loader2, Lock, Pencil, X } from 'lucide-react'

import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/user-avatar'
import { useCan } from '@/auth/auth-context'
import { useAudit } from '@/hooks/use-audit'
import {
  useComponentTree,
  useEntityTypes,
  useLineage,
  useRecord,
} from '@/hooks/use-registry'
import { isHiddenSensitive } from '@/lib/field-types'
import { statusTone } from '@/lib/tone'
import { shortId, formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ComponentTreeView } from './ComponentTreeView'
import { MaskedValue } from './MaskedValue'
import type { EntityType, FieldDef } from '@/api/registry'

function fieldValue(field: FieldDef, value: unknown) {
  if (value === undefined || value === null || value === '')
    return <span className="text-muted-foreground">—</span>
  if (typeof value === 'boolean')
    return value ? (
      <Check className="text-success size-4" />
    ) : (
      <X className="text-muted-foreground size-4" />
    )
  const s = String(value)
  const mono =
    field.type === 'reference' ||
    field.type === 'sequence' ||
    field.type === 'structure'
  return (
    <span className={cn('break-all', mono && 'font-mono text-[12px]')}>
      {field.type === 'reference' ? shortId(s) : s}
    </span>
  )
}

function LineageTab({
  projectId,
  recordId,
  typeMap,
}: {
  projectId: string
  recordId: string
  typeMap: Record<string, string>
}) {
  const { t } = useTranslation('registry')
  const tree = useComponentTree(projectId, recordId)
  const lineage = useLineage(projectId, recordId)
  const hasTree = (tree.data?.children.length ?? 0) > 0
  const hasLineage = (lineage.data?.length ?? 0) > 0

  if (tree.isLoading || lineage.isLoading)
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="text-muted-foreground size-5 animate-spin" />
      </div>
    )
  if (!hasTree && !hasLineage)
    return (
      <p className="text-muted-foreground py-8 text-center text-[13px]">
        {t('drawer.noLineage')}
      </p>
    )

  return (
    <div className="space-y-4">
      {hasTree && tree.data && (
        <div>
          <div className="text-[13px] font-bold">{t('tree.title')}</div>
          <div className="mt-2">
            <ComponentTreeView node={tree.data} typeMap={typeMap} />
          </div>
        </div>
      )}
      {hasLineage && (
        <div>
          <div className="text-[13px] font-bold">{t('lineage.title')}</div>
          <div className="mt-2 space-y-1.5">
            {lineage.data!.map((n) => (
              <div key={n.id} className="flex items-center gap-2">
                <span className="text-brand font-mono text-[12px] font-semibold">
                  {shortId(n.id)}
                </span>
                <Badge variant="neutral">
                  {typeMap[n.type_id] ?? shortId(n.type_id)}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function AuditTab({ recordId }: { recordId: string }) {
  const { t } = useTranslation('registry')
  const query = useAudit({ entity_id: recordId, limit: 20 })
  const items = query.data?.items ?? []

  if (query.isLoading)
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="text-muted-foreground size-5 animate-spin" />
      </div>
    )
  if (items.length === 0)
    return (
      <p className="text-muted-foreground py-8 text-center text-[13px]">
        {t('drawer.noAudit')}
      </p>
    )

  return (
    <div className="space-y-3">
      {items.map((a) => (
        <div key={a.id} className="flex gap-2.5">
          <UserAvatar
            seed={a.actor_id ?? a.user_name ?? '?'}
            initials={a.user_name ?? undefined}
            className="size-6"
          />
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px]">
              <b>{a.user_name ?? '—'}</b>{' '}
              <span className="text-[#5a6473]">
                {a.event_description ?? a.action}
              </span>
            </div>
            <div className="text-muted-foreground mt-0.5 text-[11px] tabular-nums">
              {formatDateTime(a.occurred_at)}
              {a.ip_address && <span className="ml-2 font-mono">IP {a.ip_address}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function AssetDrawer({
  projectId,
  type,
  recordId,
  open,
  onOpenChange,
  onEdit,
  onRelations,
}: {
  projectId: string
  type: EntityType
  recordId: string
  open: boolean
  onOpenChange: (o: boolean) => void
  onEdit?: () => void
  onRelations?: () => void
}) {
  const { t } = useTranslation('registry')
  const record = useRecord(projectId, 'asset', recordId, open)
  const types = useEntityTypes(projectId)
  const typeMap = Object.fromEntries(
    (types.data ?? []).map((ty) => [ty.id, ty.name]),
  )
  const canAudit = useCan('audit:read')

  const values = (record.data?.data ?? {}) as Record<string, unknown>
  const nameVal = String(
    values.name ?? values[type.fields[0]?.name ?? ''] ?? shortId(recordId),
  )
  const status = values.status != null ? String(values.status) : ''

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-[480px] flex-col gap-0 p-0 sm:max-w-[480px]"
      >
        <SheetTitle className="sr-only">{nameVal}</SheetTitle>

        <div className="border-b px-[22px] py-[18px]">
          <div className="text-brand font-mono text-[12px] font-semibold">
            {shortId(recordId)}
          </div>
          <div className="mt-1 flex items-center gap-2 pr-6">
            <div className="min-w-0 flex-1 truncate text-[19px] font-extrabold">
              {nameVal}
            </div>
            {status && <Badge variant={statusTone(status)}>{status}</Badge>}
          </div>
          <div className="text-muted-foreground mt-1 text-[12px]">{type.name}</div>
        </div>

        <Tabs defaultValue="fields" className="flex min-h-0 flex-1 flex-col gap-0">
          <TabsList className="shrink-0 px-[22px]">
            <TabsTrigger value="fields">{t('drawer.fields')}</TabsTrigger>
            <TabsTrigger value="lineage">{t('drawer.lineage')}</TabsTrigger>
            {canAudit && <TabsTrigger value="audit">{t('drawer.audit')}</TabsTrigger>}
          </TabsList>

          <div className="min-h-0 flex-1 overflow-auto px-[22px] py-4">
            <TabsContent value="fields" className="mt-0">
              {record.isLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="text-muted-foreground size-5 animate-spin" />
                </div>
              ) : (
                type.fields.map((f) => {
                  const masked = isHiddenSensitive(f, values)
                  return (
                    <div
                      key={f.name}
                      className="border-divider flex items-center gap-3 border-b py-[11px] last:border-0"
                    >
                      <div className="text-muted-foreground flex w-[130px] shrink-0 items-center gap-1.5 text-[12.5px]">
                        {f.name}
                        {f.sensitive && (
                          <Lock className="size-3 text-[#E0492C]" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 text-[13px] font-medium">
                        {masked ? (
                          <MaskedValue className="text-[12.5px]" />
                        ) : (
                          fieldValue(f, values[f.name])
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </TabsContent>

            <TabsContent value="lineage" className="mt-0">
              <LineageTab
                projectId={projectId}
                recordId={recordId}
                typeMap={typeMap}
              />
            </TabsContent>

            {canAudit && (
              <TabsContent value="audit" className="mt-0">
                <AuditTab recordId={recordId} />
              </TabsContent>
            )}
          </div>
        </Tabs>

        {(onEdit || onRelations) && (
          <div className="flex gap-2 border-t px-[22px] py-3">
            {onRelations && (
              <Button variant="outline" onClick={onRelations}>
                <GitBranch className="size-4" />
                {t('entities.relations')}
              </Button>
            )}
            {onEdit && (
              <Button onClick={onEdit}>
                <Pencil className="size-4" />
                {t('entities.edit')}
              </Button>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
