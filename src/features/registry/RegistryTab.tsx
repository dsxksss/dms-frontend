import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueries } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Database,
  Eye,
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
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
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
  useMyFieldAccessRequests,
  useRequestFieldAccess,
  useImportEntities,
} from '@/hooks/use-registry'
import { useToastError } from '@/hooks/use-toast-error'
import { registryApi } from '@/api/registry'
import type { Entity, EntityType, TypeKind } from '@/api/registry'
import { MaskedValue } from './MaskedValue'
import { ReferenceValue, useRefResolver } from './ReferenceValue'
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
  const importer = useImportEntities(projectId, activeType?.id ?? '')
  // 当前用户对**当前类型**记录的有效增/改/删（角色 OR 细粒度授权）——授了「新增」却没按钮即此处之前只看角色所致。
  // 与 RecordsGrid 同 queryKey，React Query 去重，不会多发请求。
  const access = useMyFieldAccess(projectId, kind, activeType?.id ?? '')
  const canCreateRecord = access.data?.can_create ?? canCreate

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
          <div className="flex items-center gap-2">
            {/* 高频动作直出：转数据集 + 类型 + 新建记录(Contributor)；建类型(Manager)/批量导入(Contributor)收进「更多」。 */}
            {canCreate && !showTypes && activeType && (
              <Button variant="outline" onClick={() => setConvertOpen(true)}>
                <Database className="size-4" />
                {t('fromRegistry.button', {
                  ns: 'datasets',
                  defaultValue: '转数据集',
                })}
              </Button>
            )}
            {/* 类型管理：放在「转数据集」右侧，所有成员可见；再次点击返回记录视图。 */}
            <Button
              variant="outline"
              onClick={() => setTab(showTypes ? '' : TYPES_TAB)}
              className={cn(showTypes && 'border-brand text-brand')}
            >
              <Settings2 className="size-4" />
              {t('tabs.types')}
            </Button>
            {canCreateRecord && !showTypes && activeType && (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" />
                {t('entities.create')}
              </Button>
            )}
            {canCreate && (canManage || (!showTypes && activeType && isAsset)) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" title={t('more')}>
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {/* 建类型 = Manager；批量导入 = Contributor */}
                  {canManage && (
                    <DropdownMenuItem onClick={() => setCreateTypeOpen(true)}>
                      <Wand2 className="size-4" />
                      {isAsset
                        ? t('types.createAsset')
                        : t('types.createTemplate')}
                    </DropdownMenuItem>
                  )}
                  {!showTypes && activeType && isAsset && (
                    <DropdownMenuItem onClick={() => setImportOpen(true)}>
                      <FileUp className="size-4" />
                      {t('import.button')}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        }
      />

      {/* type sub-tabs */}
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
          canCreate={canCreateRecord}
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
              importer={importer}
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
  canCreate,
  onCreate,
}: {
  projectId: string
  kind: TypeKind
  type: EntityType
  canCreate: boolean
  onCreate: () => void
}) {
  const { t } = useTranslation('registry')
  const [page, setPage] = useState({ limit: 20, offset: 0 })
  const query = useRecords(projectId, kind, { type: type.id, ...page })
  const access = useMyFieldAccess(projectId, kind, type.id)
  const myAccessRequests = useMyFieldAccessRequests(projectId, kind, type.id, 'pending')
  const requestAccess = useRequestFieldAccess(projectId, kind, type.id)
  // 列级锁定字段：权威来自 my-field-access，不再靠「单元格值为空」猜。
  const lockedFields = new Set(access.data?.locked_fields ?? [])
  const requestedFields = new Set((myAccessRequests.data ?? []).map((r) => r.field))
  // 记录的改/删按钮按**有效权限**（角色 OR 细粒度授权）显示——之前错按 Manager 角色，贡献者/被授权者都看不到。
  const canUpdate = access.data?.can_update ?? false
  const canDelete = access.data?.can_delete ?? false
  const del = useDeleteRecord(projectId, kind)
  const toastError = useToastError()
  const [selected, setSelected] = useState<Entity | null>(null)
  const [editTarget, setEditTarget] = useState<Entity | null>(null)

  const shown = type.fields.slice(0, 4)
  const cols = `108px ${shown.map(() => 'minmax(0,1fr)').join(' ')} 48px`
  const records = query.data?.items ?? []

  // 引用字段：软引用存的是目标记录 uuid。把可见列里的引用解析成被引用记录的「name」，
  // 否则用户看到一串 uuid。ref_type 是目标资产类型 key → 找到其 type.id → 拉该类型记录建 id→name。
  // 引用字段：软引用存目标 uuid。解析成目标记录名 + 悬浮卡片（见 ReferenceValue，含权限脱敏）。
  const resolveRef = useRefResolver(projectId, shown)

  const onDelete = (r: Entity) =>
    del
      .mutateAsync({ id: r.id, version: r.version })
      .then(() => toast.success(t('entities.deleted')))
      .catch(toastError)

  const onRequestAccess = (field: string) =>
    requestAccess
      .mutateAsync({ field })
      .then(() => toast.success(t('accessRequests.requested')))
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
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="size-5 text-[#E0492C] hover:bg-[#FFF3F0] hover:text-[#E0492C]"
                  title={
                    requestedFields.has(f.name)
                      ? t('accessRequests.pending')
                      : t('accessRequests.requestTitle', { field: f.name })
                  }
                  disabled={requestedFields.has(f.name) || requestAccess.isPending}
                  onClick={() => onRequestAccess(f.name)}
                >
                  <Lock className="size-3" />
                </Button>
              )}
            </div>
          ))}
          <div />
        </div>

        {records.map((r) => (
          <ContextMenu key={r.id}>
            <ContextMenuTrigger asChild>
          <div
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
              const resolved = f.type === 'reference' ? resolveRef(f, v) : null
              return (
                <div key={f.name} className="truncate pr-2">
                  {locked ? (
                    <MaskedValue />
                  ) : v == null || v === '' ? (
                    <span className="text-muted-foreground">—</span>
                  ) : resolved ? (
                    <ReferenceValue resolved={resolved} />
                  ) : (
                    <span className={cn(f.type === 'sequence' && 'mono text-[12px]')}>
                      {String(v)}
                    </span>
                  )}
                </div>
              )
            })}
            <div onClick={(e) => e.stopPropagation()}>
              {(canUpdate || canDelete) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canUpdate && (
                      <DropdownMenuItem onClick={() => setEditTarget(r)}>
                        <Pencil className="size-4" />
                        {t('entities.edit')}
                      </DropdownMenuItem>
                    )}
                    {canDelete && (
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => onDelete(r)}
                      >
                        <Trash2 className="size-4" />
                        {t('actions.delete', { ns: 'common', defaultValue: '删除' })}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-40">
              <ContextMenuItem onClick={() => setSelected(r)}>
                <Eye className="size-4" />
                {t('actions.open', { ns: 'common', defaultValue: '查看' })}
              </ContextMenuItem>
              {canUpdate && (
                <ContextMenuItem onClick={() => setEditTarget(r)}>
                  <Pencil className="size-4" />
                  {t('entities.edit')}
                </ContextMenuItem>
              )}
              {canDelete && (
                <>
                  <ContextMenuSeparator />
                  <ContextMenuItem variant="destructive" onClick={() => onDelete(r)}>
                    <Trash2 className="size-4" />
                    {t('actions.delete', { ns: 'common', defaultValue: '删除' })}
                  </ContextMenuItem>
                </>
              )}
            </ContextMenuContent>
          </ContextMenu>
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
