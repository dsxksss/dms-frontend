import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueries } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Database,
  FileUp,
  Lock,
  MoreHorizontal,
  Pencil,
  Plus,
  Settings2,
  Trash2,
  Wand2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PageHeader } from '@/components/page-header'
import { TableCard, GridFooter } from '@/components/data-grid'
import { Pagination } from '@/components/pagination'
import { EmptyState, ErrorState, TableSkeleton } from '@/components/states'
import { cn } from '@/lib/utils'
import { roleAtLeast } from '@/lib/roles'
import { shortId } from '@/lib/format'
import { useProjectRole } from '@/hooks/use-projects'
import {
  useEntityTypes,
  useRecords,
  useDeleteRecord,
  useMyFieldAccess,
} from '@/hooks/use-registry'
import { useToastError } from '@/hooks/use-toast-error'
import { registryApi } from '@/api/registry'
import type { Entity, EntityType, TypeKind } from '@/api/registry'
import { MaskedValue } from './MaskedValue'
import { AssetDrawer } from './AssetDrawer'
import { EntityDialog } from './EntityDialog'
import { EntityTypeDialog } from './EntityTypeDialog'
import { ImportEntitiesDialog } from './ImportEntitiesDialog'
import { EntityTypesPanel } from './EntityTypesPanel'
import { FromRegistryDialog } from '@/features/datasets/FromRegistryDialog'

const TYPES_TAB = '__types__'

/** 注册表主面板，按 kind 复用：药物资产(asset) / 数据资产(template，模板类型+模板数据)。 */
export function RegistryTab({
  projectId,
  kind,
}: {
  projectId: string
  kind: TypeKind
}) {
  const { t } = useTranslation('registry')
  const role = useProjectRole(projectId)
  const canCreate = roleAtLeast(role, 'contributor')
  const canManage = roleAtLeast(role, 'manager')
  const types = useEntityTypes(projectId)
  const [tab, setTab] = useState<string>('')
  const [createTypeOpen, setCreateTypeOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [convertOpen, setConvertOpen] = useState(false)

  const isAsset = kind === 'asset'
  const kindTypes = (types.data ?? []).filter((ty) => ty.kind === kind)
  const showTypes = tab === TYPES_TAB
  const activeType = showTypes
    ? undefined
    : (kindTypes.find((ty) => ty.id === tab) ?? kindTypes[0])

  const counts = useQueries({
    queries: kindTypes.map((ty) => ({
      queryKey: ['registry', projectId, 'count', kind, ty.id],
      queryFn: () =>
        registryApi
          .listRecords(projectId, kind, { type: ty.id, limit: 1 })
          .then((r) => r.total),
      staleTime: 30_000,
    })),
  })
  const countOf = (i: number) => counts[i]?.data

  return (
    <div className="px-[26px] py-[22px]">
      <PageHeader
        title={isAsset ? t('tabs.assets') : t('title')}
        titleEn={isAsset ? 'Drug Assets' : 'Data Assets'}
        description={isAsset ? t('subtitle') : t('dataSubtitle')}
        size="md"
        actions={
          canManage && (
            <>
              <Button variant="outline" onClick={() => setCreateTypeOpen(true)}>
                <Wand2 className="size-4" />
                {isAsset ? t('types.createAsset') : t('types.createTemplate')}
              </Button>
              {!showTypes && activeType && isAsset && (
                <Button variant="outline" onClick={() => setImportOpen(true)}>
                  <FileUp className="size-4" />
                  {t('import.button')}
                </Button>
              )}
              {!showTypes && activeType && (
                <Button variant="outline" onClick={() => setConvertOpen(true)}>
                  <Database className="size-4" />
                  {t('fromRegistry.button', {
                    ns: 'datasets',
                    defaultValue: '转数据集',
                  })}
                </Button>
              )}
              {!showTypes && activeType && canCreate && (
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="size-4" />
                  {t('entities.create')}
                </Button>
              )}
            </>
          )
        }
      />

      {/* type sub-tabs + 类型管理 tab */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5 border-b">
        {kindTypes.map((ty, i) => {
          const on = !showTypes && activeType?.id === ty.id
          return (
            <button
              key={ty.id}
              type="button"
              onClick={() => setTab(ty.id)}
              className={cn(
                '-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-[13px] font-semibold transition',
                on
                  ? 'border-brand text-brand'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {ty.name}
              <span
                className={cn(
                  'rounded-full px-1.5 py-px text-[11px]',
                  on ? 'bg-accent text-brand' : 'bg-[#F0F2F6] text-muted-foreground',
                )}
              >
                {countOf(i) ?? '·'}
              </span>
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => setTab(TYPES_TAB)}
          className={cn(
            '-mb-px ml-auto flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-[13px] font-semibold transition',
            showTypes
              ? 'border-brand text-brand'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          <Settings2 className="size-4" />
          {t('tabs.types')}
        </button>
      </div>

      {showTypes ? (
        <EntityTypesPanel projectId={projectId} kindFilter={kind} />
      ) : kindTypes.length === 0 ? (
        <EmptyState
          title={t('types.empty')}
          hint={isAsset ? t('entities.noAssetTypes') : t('entities.noTemplates')}
          action={
            canManage && (
              <Button onClick={() => setCreateTypeOpen(true)}>
                <Wand2 className="size-4" />
                {isAsset ? t('types.createAsset') : t('types.createTemplate')}
              </Button>
            )
          }
        />
      ) : activeType ? (
        <RecordsGrid
          projectId={projectId}
          kind={kind}
          type={activeType}
          canManage={canManage}
          canCreate={canCreate}
          onCreate={() => setCreateOpen(true)}
        />
      ) : null}

      {/* dialogs */}
      <EntityTypeDialog
        projectId={projectId}
        kind={kind}
        open={createTypeOpen}
        onOpenChange={setCreateTypeOpen}
      />
      {activeType && (
        <>
          {isAsset && (
            <ImportEntitiesDialog
              projectId={projectId}
              typeId={activeType.id}
              open={importOpen}
              onOpenChange={setImportOpen}
            />
          )}
          <EntityDialog
            projectId={projectId}
            kind={kind}
            type={activeType}
            open={createOpen}
            onOpenChange={setCreateOpen}
          />
          <FromRegistryDialog
            projectId={projectId}
            type={activeType}
            canManage={canManage}
            open={convertOpen}
            onOpenChange={setConvertOpen}
          />
        </>
      )}
    </div>
  )
}

function RecordsGrid({
  projectId,
  kind,
  type,
  canManage,
  canCreate,
  onCreate,
}: {
  projectId: string
  kind: TypeKind
  type: EntityType
  canManage: boolean
  canCreate: boolean
  onCreate: () => void
}) {
  const { t } = useTranslation('registry')
  const [page, setPage] = useState({ limit: 20, offset: 0 })
  const query = useRecords(projectId, kind, { type: type.id, ...page })
  const access = useMyFieldAccess(projectId, kind, type.id)
  // 列级锁定字段：权威来自 my-field-access，不再靠「单元格值为空」猜。
  const lockedFields = new Set(access.data?.locked_fields ?? [])
  const del = useDeleteRecord(projectId, kind)
  const toastError = useToastError()
  const [selected, setSelected] = useState<Entity | null>(null)
  const [editTarget, setEditTarget] = useState<Entity | null>(null)

  const shown = type.fields.slice(0, 4)
  const cols = `108px ${shown.map(() => 'minmax(0,1fr)').join(' ')} 48px`
  const records = query.data?.items ?? []

  const onDelete = (r: Entity) =>
    del
      .mutateAsync({ id: r.id, version: r.version })
      .then(() => toast.success(t('entities.deleted')))
      .catch(toastError)

  if (query.isLoading) return <TableSkeleton rows={6} />
  if (query.isError)
    return <ErrorState error={query.error} onRetry={() => query.refetch()} />
  if (records.length === 0)
    return (
      <EmptyState
        title={t('entities.empty')}
        hint={t('entities.emptyHint')}
        action={
          canCreate ? (
            <Button onClick={onCreate}>
              <Plus className="size-4" />
              {t('entities.create')}
            </Button>
          ) : undefined
        }
      />
    )

  return (
    <>
      <TableCard>
        <div
          className="grid items-center border-b bg-surface-2 px-4 py-[11px]"
          style={{ gridTemplateColumns: cols }}
        >
          <div className="th">ID</div>
          {shown.map((f) => (
            <div key={f.name} className="th flex items-center gap-1 truncate">
              <span className="truncate">{f.name}</span>
              {lockedFields.has(f.name) && (
                <Lock className="size-3 shrink-0 text-[#E0492C]" />
              )}
            </div>
          ))}
          <div />
        </div>

        {records.map((r) => (
          <div
            key={r.id}
            className="trow grid cursor-pointer items-center border-b border-divider px-4 py-3 text-[13px] last:border-b-0"
            style={{ gridTemplateColumns: cols }}
            onClick={() => setSelected(r)}
          >
            <div className="mono truncate text-[12px] font-semibold text-brand">
              {shortId(r.id)}
            </div>
            {shown.map((f) => {
              const v = r.data[f.name]
              const locked = lockedFields.has(f.name)
              return (
                <div key={f.name} className="truncate pr-2">
                  {locked ? (
                    <MaskedValue />
                  ) : v == null || v === '' ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <span className={cn(f.type === 'sequence' && 'mono text-[12px]')}>
                      {String(v)}
                    </span>
                  )}
                </div>
              )
            })}
            <div onClick={(e) => e.stopPropagation()}>
              {canManage && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditTarget(r)}>
                      <Pencil className="size-4" />
                      {t('entities.edit')}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => onDelete(r)}
                    >
                      <Trash2 className="size-4" />
                      {t('actions.delete', { ns: 'common', defaultValue: '删除' })}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        ))}

        <GridFooter>
          <span>
            {t('table.total', { ns: 'common', total: query.data?.total ?? 0 })}
          </span>
          <Pagination
            limit={page.limit}
            offset={page.offset}
            total={query.data?.total ?? 0}
            onChange={setPage}
          />
        </GridFooter>
      </TableCard>

      {selected && (
        <AssetDrawer
          projectId={projectId}
          type={type}
          entity={selected}
          open={!!selected}
          onOpenChange={(o) => !o && setSelected(null)}
          onEdit={() => {
            setEditTarget(selected)
            setSelected(null)
          }}
        />
      )}
      {editTarget && (
        <EntityDialog
          projectId={projectId}
          kind={kind}
          type={type}
          record={editTarget}
          open={!!editTarget}
          onOpenChange={(o) => !o && setEditTarget(null)}
        />
      )}
    </>
  )
}
