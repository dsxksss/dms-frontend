import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, GitBranch, Loader2, MoreHorizontal, Pencil, Plus, Trash2, Upload, X } from 'lucide-react'
import { toast } from 'sonner'

import { EmptyState, ErrorState } from '@/components/states'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useProjectRole } from '@/hooks/use-projects'
import { useDeleteRecord, useRecords, useEntityTypes } from '@/hooks/use-registry'
import { useToastError } from '@/hooks/use-toast-error'
import { roleAtLeast } from '@/lib/roles'
import { shortId } from '@/lib/format'
import { cn } from '@/lib/utils'
import { isHiddenSensitive } from '@/lib/field-types'
import type { Entity, EntityType, FieldDef, TypeKind } from '@/api/registry'
import { EntityDialog } from './EntityDialog'
import { EntityRelationsDialog } from './EntityRelationsDialog'
import { ImportEntitiesDialog } from './ImportEntitiesDialog'
import { AssetDrawer } from './AssetDrawer'
import { MaskedValue } from './MaskedValue'

function Cell({ field, data }: { field: FieldDef; data: Record<string, unknown> }) {
  if (isHiddenSensitive(field, data)) {
    return <MaskedValue className="text-[12px]" />
  }
  const val = data[field.name]
  if (val === undefined || val === null || val === '')
    return <span className="text-muted-foreground">-</span>
  if (typeof val === 'boolean')
    return val ? (
      <Check className="text-success size-4" />
    ) : (
      <X className="text-muted-foreground size-4" />
    )
  if (field.type === 'reference')
    return <span className="font-mono text-xs">{shortId(String(val))}</span>
  const s = String(val)
  return (
    <span className="block max-w-[24ch] truncate" title={s}>
      {s}
    </span>
  )
}

/** 记录列表：药物资产(kind=asset) 或 药物数据(kind=template)。 */
export function RecordsPanel({
  projectId,
  kind,
}: {
  projectId: string
  kind: TypeKind
}) {
  const { t } = useTranslation('registry')
  const role = useProjectRole(projectId)
  const canEdit = roleAtLeast(role, 'contributor')
  const allTypes = useEntityTypes(projectId)
  const types = (allTypes.data ?? []).filter((ty) => ty.kind === kind)
  const toastError = useToastError()

  const [typeId, setTypeId] = useState('')
  const [page, setPage] = useState({ limit: 20, offset: 0 })
  useEffect(() => {
    if (!typeId && types.length > 0) setTypeId(types[0].id)
  }, [types, typeId])

  const selectedType: EntityType | undefined = types.find((ty) => ty.id === typeId)
  const records = useRecords(projectId, kind, { type: typeId, ...page }, !!typeId)

  const [createOpen, setCreateOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Entity | null>(null)
  const [relTarget, setRelTarget] = useState<Entity | null>(null)
  const [delTarget, setDelTarget] = useState<Entity | null>(null)
  const [drawerTarget, setDrawerTarget] = useState<Entity | null>(null)
  const del = useDeleteRecord(projectId, kind)

  const isAsset = kind === 'asset'
  const fields = selectedType?.fields ?? []
  const items = records.data?.items ?? []
  const total = records.data?.total ?? 0
  const hasMore = page.offset + items.length < total

  // 动态列：ID + 每个字段 + (模板)资产记录 + 操作。
  const gridTemplate = [
    '104px',
    ...fields.map(() => 'minmax(130px,1fr)'),
    ...(isAsset ? [] : ['140px']),
    '48px',
  ].join(' ')
  const minWidth = 152 + fields.length * 140 + (isAsset ? 0 : 140)

  const rowMenu = (e: Entity) => (
    <span className="flex justify-end" onClick={(ev) => ev.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isAsset && (
            <DropdownMenuItem onClick={() => setRelTarget(e)}>
              <GitBranch className="size-4" />
              {t('entities.relations')}
            </DropdownMenuItem>
          )}
          {canEdit && (
            <>
              <DropdownMenuItem onClick={() => setEditTarget(e)}>
                <Pencil className="size-4" />
                {t('entities.edit')}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setDelTarget(e)}
              >
                <Trash2 className="size-4" />
                {t('actions.delete', { ns: 'common' })}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </span>
  )

  const onDelete = async () => {
    if (!delTarget) return
    try {
      await del.mutateAsync({ id: delTarget.id, version: delTarget.version })
      toast.success(t('entities.deleted'))
      setDelTarget(null)
    } catch (e) {
      toastError(e)
    }
  }

  if (allTypes.data && types.length === 0) {
    return (
      <EmptyState
        title={t(isAsset ? 'entities.noAssetTypes' : 'entities.noTemplates')}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5 border-b">
        {types.map((ty) => (
          <button
            key={ty.id}
            onClick={() => {
              setTypeId(ty.id)
              setPage({ limit: 20, offset: 0 })
            }}
            className={cn(
              '-mb-px border-b-2 px-3 py-2.5 text-[13px] font-semibold whitespace-nowrap transition-colors',
              typeId === ty.id
                ? 'border-brand text-brand'
                : 'text-muted-foreground hover:text-foreground border-transparent',
            )}
          >
            {ty.name}
          </button>
        ))}
        {canEdit && selectedType && (
          <div className="ml-auto flex gap-2 pb-1.5">
            {isAsset && (
              <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                <Upload className="size-4" />
                {t('import.button')}
              </Button>
            )}
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              {t('entities.create')}
            </Button>
          </div>
        )}
      </div>

      {records.isLoading || (!!typeId && !selectedType) ? (
        <div className="flex justify-center py-16">
          <Loader2 className="text-muted-foreground size-6 animate-spin" />
        </div>
      ) : records.isError ? (
        <ErrorState error={records.error} onRetry={() => records.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState title={t('entities.empty')} />
      ) : (
        <>
          <Card className="gap-0 overflow-hidden py-0">
            <div className="overflow-x-auto">
              <div style={{ minWidth }}>
                <div
                  className="bg-surface-2 text-muted-foreground grid gap-2 border-b px-4 py-2.5 text-[11px] font-semibold tracking-[0.04em] uppercase"
                  style={{ gridTemplateColumns: gridTemplate }}
                >
                  <div>ID</div>
                  {fields.map((f) => (
                    <div key={f.name} className="truncate normal-case">
                      {f.name}
                    </div>
                  ))}
                  {!isAsset && <div>{t('entities.assetRecord')}</div>}
                  <div />
                </div>
                {items.map((e) => (
                  <div
                    key={e.id}
                    className={cn(
                      'border-divider grid items-center gap-2 border-b px-4 py-3 text-[13px] last:border-b-0',
                      isAsset && 'hover:bg-row-hover cursor-pointer',
                    )}
                    style={{ gridTemplateColumns: gridTemplate }}
                    onClick={isAsset ? () => setDrawerTarget(e) : undefined}
                  >
                    <span className="text-brand font-mono text-xs font-semibold">
                      {shortId(e.id)}
                    </span>
                    {fields.map((f) => (
                      <span key={f.name} className="min-w-0 truncate text-[12.5px]">
                        <Cell field={f} data={e.data} />
                      </span>
                    ))}
                    {!isAsset && (
                      <span className="text-muted-foreground font-mono text-xs">
                        {e.asset_record_id ? shortId(e.asset_record_id) : '—'}
                      </span>
                    )}
                    {rowMenu(e)}
                  </div>
                ))}
              </div>
            </div>
          </Card>
          {(page.offset > 0 || hasMore) && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page.offset === 0}
                onClick={() =>
                  setPage((p) => ({ ...p, offset: Math.max(0, p.offset - p.limit) }))
                }
              >
                {t('table.prev', { ns: 'common' })}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!hasMore}
                onClick={() => setPage((p) => ({ ...p, offset: p.offset + p.limit }))}
              >
                {t('table.next', { ns: 'common' })}
              </Button>
            </div>
          )}
        </>
      )}

      {selectedType && (
        <>
          <EntityDialog
            projectId={projectId}
            type={selectedType}
            open={createOpen}
            onOpenChange={setCreateOpen}
          />
          <EntityDialog
            projectId={projectId}
            type={selectedType}
            entity={editTarget}
            open={!!editTarget}
            onOpenChange={(o) => !o && setEditTarget(null)}
          />
          {isAsset && (
            <ImportEntitiesDialog
              projectId={projectId}
              type={selectedType}
              open={importOpen}
              onOpenChange={setImportOpen}
            />
          )}
        </>
      )}
      {relTarget && (
        <EntityRelationsDialog
          projectId={projectId}
          entity={relTarget}
          open={!!relTarget}
          onOpenChange={(o) => !o && setRelTarget(null)}
        />
      )}
      <ConfirmDialog
        open={!!delTarget}
        onOpenChange={(o) => !o && setDelTarget(null)}
        title={t('entities.deleteTitle')}
        description={t('entities.deleteDesc')}
        destructive
        loading={del.isPending}
        onConfirm={onDelete}
      />
      {drawerTarget && selectedType && (
        <AssetDrawer
          projectId={projectId}
          type={selectedType}
          recordId={drawerTarget.id}
          open={!!drawerTarget}
          onOpenChange={(o) => !o && setDrawerTarget(null)}
          onEdit={
            canEdit
              ? () => {
                  setEditTarget(drawerTarget)
                  setDrawerTarget(null)
                }
              : undefined
          }
          onRelations={() => {
            setRelTarget(drawerTarget)
            setDrawerTarget(null)
          }}
        />
      )}
    </div>
  )
}
