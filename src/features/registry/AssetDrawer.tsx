import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GitBranch, Link2, Pencil, ShieldCheck } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UserAvatar } from '@/components/user-avatar'
import { statusTone } from '@/components/tone'
import { useAudit } from '@/hooks/use-audit'
import { useCan } from '@/auth/auth-context'
import { useProjectRole } from '@/hooks/use-projects'
import { useEntityTypes, useMyFieldAccess, useRecord } from '@/hooks/use-registry'
import { roleAtLeast } from '@/lib/roles'
import { formatDateTime, shortId } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Entity, EntityType } from '@/api/registry'
import { MaskedValue } from './MaskedValue'
import { ReferenceValue, useRefResolver } from './ReferenceValue'
import { ComponentTreeView } from './ComponentTreeView'
import { FieldGrantsDialog } from './FieldGrantsDialog'

/** 资产详情抽屉：右侧 480px，字段 / 谱系 / 审计。 */
export function AssetDrawer({
  projectId,
  type,
  entity,
  open,
  onOpenChange,
  onEdit,
}: {
  projectId: string
  type: EntityType
  entity: Entity
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: () => void
}) {
  const { t } = useTranslation('registry')
  const role = useProjectRole(projectId)
  const canManage = roleAtLeast(role, 'manager')
  const canAudit = useCan('audit:read')
  const [grantsOpen, setGrantsOpen] = useState(false)
  const [tab, setTab] = useState('fields')

  const access = useMyFieldAccess(projectId, type.kind, type.id)
  const lockedFields = new Set(access.data?.locked_fields ?? [])
  // 编辑按钮按**有效改权限**（角色 OR 细粒度授权）显示，而非 Manager 角色。
  const canUpdate = access.data?.can_update ?? false

  const data = entity.data
  const name = String(data.name ?? shortId(entity.id))
  const status = data.status ? String(data.status) : null
  const hasSensitive = type.fields.some((f) => f.sensitive)

  // 引用字段 uuid → 目标记录名 + 悬浮卡片（与列表视图一致，含权限脱敏）。
  const resolveRef = useRefResolver(projectId, type.fields)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-[480px] flex-col gap-0 p-0 sm:max-w-[480px]"
      >
        <SheetTitle className="sr-only">{name}</SheetTitle>

        {/* header */}
        <div className="flex items-start gap-3 border-b px-[22px] py-[18px]">
          <div className="min-w-0 flex-1">
            <div className="mono text-[12px] font-semibold text-brand">
              {shortId(entity.id)}
            </div>
            <div className="mt-0.5 truncate text-[19px] font-extrabold">{name}</div>
            <div className="mt-0.5 text-[12px] text-muted-foreground">
              {type.name}
            </div>
          </div>
          {status && <Badge variant={statusTone(status)}>{status}</Badge>}
        </div>

        <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
          <TabsList className="mx-[22px] mt-2 justify-start">
            <TabsTrigger value="fields">{t('drawer.fields')}</TabsTrigger>
            {type.kind === 'template' && (
              <TabsTrigger value="relations">{t('drawer.relations')}</TabsTrigger>
            )}
            <TabsTrigger value="lineage">{t('drawer.lineage')}</TabsTrigger>
            <TabsTrigger value="audit">{t('drawer.audit')}</TabsTrigger>
          </TabsList>

          <div className="min-h-0 flex-1 overflow-auto px-[22px] py-4">
            <TabsContent value="fields" className="mt-0">
              <div>
                {type.fields.map((f) => {
                  const v = data[f.name]
                  const masked = lockedFields.has(f.name)
                  const resolved = f.type === 'reference' ? resolveRef(f, v) : null
                  return (
                    <div
                      key={f.name}
                      className="flex items-center gap-3 border-b border-divider py-2.5"
                    >
                      <div className="flex w-[130px] shrink-0 items-center gap-1.5 text-[12.5px] text-muted-foreground">
                        {f.name}
                        {f.sensitive && (
                          <ShieldCheck className="size-3 text-[#E0492C]" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        {masked ? (
                          <MaskedValue />
                        ) : v == null || v === '' ? (
                          <span className="text-[13px] text-muted-foreground">—</span>
                        ) : resolved ? (
                          <ReferenceValue resolved={resolved} className="text-[13px]" />
                        ) : (
                          <span
                            className={cn(
                              'text-[13px] font-semibold break-all',
                              (f.type === 'sequence' || f.sensitive) && 'mono',
                            )}
                          >
                            {String(v)}
                            {f.unit_symbol && (
                              <span className="ml-1 text-[11px] font-medium text-muted-foreground">
                                {f.unit_symbol}
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {hasSensitive && canManage && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 w-full"
                  onClick={() => setGrantsOpen(true)}
                >
                  <ShieldCheck className="size-4" />
                  {t('grants.title')}
                </Button>
              )}
            </TabsContent>

            {type.kind === 'template' && (
              <TabsContent value="relations" className="mt-0">
                <LinkedAssetPanel projectId={projectId} entity={entity} />
              </TabsContent>
            )}

            <TabsContent value="lineage" className="mt-0">
              <ComponentTreeView projectId={projectId} assetId={entity.id} />
            </TabsContent>

            <TabsContent value="audit" className="mt-0">
              {canAudit ? (
                <AssetAudit entityId={entity.id} />
              ) : (
                <p className="py-8 text-center text-[12.5px] text-muted-foreground">
                  {t('drawer.noAudit')}
                </p>
              )}
            </TabsContent>
          </div>
        </Tabs>

        {/* footer */}
        <div className="flex gap-2 border-t px-[22px] py-3">
          {canUpdate && (
            <Button variant="outline" className="flex-1" onClick={onEdit}>
              <Pencil className="size-4" />
              {t('entities.edit')}
            </Button>
          )}
          <Button
            variant="outline"
            className="flex-1"
            disabled={type.kind !== 'template'}
            onClick={() => setTab(type.kind === 'template' ? 'relations' : 'lineage')}
          >
            <GitBranch className="size-4" />
            {t('entities.relations')}
          </Button>
        </div>
      </SheetContent>

      {hasSensitive && (
        <FieldGrantsDialog
          projectId={projectId}
          type={type}
          open={grantsOpen}
          onOpenChange={setGrantsOpen}
        />
      )}
    </Sheet>
  )
}

function LinkedAssetPanel({
  projectId,
  entity,
}: {
  projectId: string
  entity: Entity
}) {
  const { t } = useTranslation('registry')
  const linkedId = entity.asset_record_id ?? ''
  const linked = useRecord(projectId, 'asset', linkedId, !!linkedId)
  const types = useEntityTypes(projectId)
  const linkedType = (types.data ?? []).find((ty) => ty.id === linked.data?.type_id)
  const access = useMyFieldAccess(projectId, 'asset', linkedType?.id ?? '')
  const lockedFields = new Set(access.data?.locked_fields ?? [])

  if (!linkedId) {
    return (
      <p className="py-8 text-center text-[12.5px] text-muted-foreground">
        {t('relations.noLinkedAsset')}
      </p>
    )
  }

  if (linked.isLoading || types.isLoading) {
    return (
      <p className="py-8 text-center text-[12.5px] text-muted-foreground">
        {t('relations.loadingLinkedAsset')}
      </p>
    )
  }

  if (linked.isError || !linked.data || !linkedType) {
    return (
      <p className="py-8 text-center text-[12.5px] text-muted-foreground">
        {t('relations.linkedAssetUnavailable')}
      </p>
    )
  }

  const data = linked.data.data
  const name = String(data.name ?? shortId(linked.data.id))

  return (
    <div className="space-y-3">
      <div className="rounded-[10px] border bg-surface-1 p-3">
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-brand">
            <Link2 className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              {t('relations.linkedAsset')}
            </div>
            <div className="mt-0.5 truncate text-[14px] font-bold">{name}</div>
            <div className="mt-0.5 text-[12px] text-muted-foreground">
              {linkedType.name} · {shortId(linked.data.id)}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[10px] border">
        {linkedType.fields.map((f) => {
          const v = data[f.name]
          const masked = lockedFields.has(f.name)
          return (
            <div
              key={f.name}
              className="flex items-center gap-3 border-b border-divider px-3 py-2.5 last:border-b-0"
            >
              <div className="flex w-[130px] shrink-0 items-center gap-1.5 text-[12.5px] text-muted-foreground">
                {f.name}
                {f.sensitive && <ShieldCheck className="size-3 text-[#E0492C]" />}
              </div>
              <div className="min-w-0 flex-1">
                {masked ? (
                  <MaskedValue />
                ) : v == null || v === '' ? (
                  <span className="text-[13px] text-muted-foreground">—</span>
                ) : (
                  <span
                    className={cn(
                      'text-[13px] font-semibold break-all',
                      (f.type === 'sequence' || f.sensitive) && 'mono',
                    )}
                  >
                    {String(v)}
                    {f.unit_symbol && (
                      <span className="ml-1 text-[11px] font-medium text-muted-foreground">
                        {f.unit_symbol}
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AssetAudit({ entityId }: { entityId: string }) {
  const { t } = useTranslation('registry')
  const query = useAudit({ entity_id: entityId, limit: 20 })
  const entries = query.data?.items ?? []
  if (entries.length === 0) {
    return (
      <p className="py-8 text-center text-[12.5px] text-muted-foreground">
        {t('drawer.noAudit')}
      </p>
    )
  }
  return (
    <div>
      {entries.map((a) => (
        <div
          key={a.id}
          className="flex gap-2.5 border-b border-divider py-2.5 last:border-b-0"
        >
          <UserAvatar
            name={a.user_name || '?'}
            seed={a.actor_id || a.id}
            size={24}
            className="mt-0.5"
          />
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px]">
              <b>{a.user_name || a.user_handle || '—'}</b>{' '}
              <span className="text-muted-foreground">
                {a.event_description || a.action}
              </span>
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              {formatDateTime(a.occurred_at)}
              {a.ip_address && ` · IP ${a.ip_address}`}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
