import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { useTranslation } from 'react-i18next'
import { useQueries, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Database,
  Eye,
  FileUp,
  Lock,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
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
import {
  GridColumnResizeHandle,
  GridFooter,
  GridSearchToolbar,
  GridSortButton,
  type GridSortState,
  TableCard,
  useResizableGridColumns,
} from '@/components/data-grid'
import {
  DEFAULT_PAGE_LIMIT,
  DEFAULT_PAGE_SIZE_OPTIONS,
  Pagination,
} from '@/components/pagination'
import { EmptyState, ErrorState, TableSkeleton } from '@/components/states'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { cn } from '@/lib/utils'
import { roleAtLeast } from '@/lib/roles'
import { shortId } from '@/lib/format'
import { useProjectRole } from '@/hooks/use-projects'
import { useDebounce } from '@/hooks/use-debounce'
import {
  useEntityTypes,
  useRecords,
  useDeleteRecord,
  usePurgeRecord,
  useRestoreRecord,
  useMyFieldAccess,
  useMyFieldAccessRequests,
  useRequestFieldAccess,
  useImportEntities,
} from '@/hooks/use-registry'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToastError } from '@/hooks/use-toast-error'
import { fieldDisplayName, registryApi } from '@/api/registry'
import type { Entity, EntityType, TypeKind } from '@/api/registry'
import type { FieldDef } from '@/api/registry'
import { MaskedValue } from './MaskedValue'
import { ReferenceValue, useRefResolver } from './ReferenceValue'
import { AssetDrawer } from './AssetDrawer'
import { EntityDialog } from './EntityDialog'
import { EntityTypeDialog } from './EntityTypeDialog'
import { ImportEntitiesDialog } from './ImportEntitiesDialog'
import { EntityTypesPanel } from './EntityTypesPanel'
import { TypeFieldsDialog } from './TypeFieldsDialog'
import { FromAssetRecordsDialog } from './FromAssetRecordsDialog'
import { FromRegistryDialog } from '@/features/datasets/FromRegistryDialog'

const TYPES_TAB = '__types__'
const CANVAS_RECORD_THRESHOLD = 500
const CANVAS_FIELD_THRESHOLD = 12
const CANVAS_PAGE_LIMIT = 200
const CANVAS_PAGE_SIZE_OPTIONS = [100, 200] as const

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
  const [createFromAssetOpen, setCreateFromAssetOpen] = useState(false)
  const [convertOpen, setConvertOpen] = useState(false)
  const [fieldsOpen, setFieldsOpen] = useState(false)
  const [trashOpen, setTrashOpen] = useState(false)

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
  const trashCounts = useQueries({
    queries: kindTypes.map((ty) => ({
      queryKey: ['registry', projectId, 'trash-count', kind, ty.id],
      queryFn: () =>
        registryApi
          .listRecords(projectId, kind, {
            type: ty.id,
            deleted: true,
            limit: 1,
          })
          .then((r) => r.total),
      staleTime: 30_000,
    })),
  })
  const countOf = (i: number) => counts[i]?.data
  const trashCountOf = (i: number) => trashCounts[i]?.data
  const activeTypeIndex = activeType
    ? kindTypes.findIndex((ty) => ty.id === activeType.id)
    : -1
  const activeTypeCount =
    activeTypeIndex >= 0 ? countOf(activeTypeIndex) : undefined
  const activeTrashCount =
    activeTypeIndex >= 0 ? trashCountOf(activeTypeIndex) : undefined

  return (
    <div className="px-[26px] py-[22px]">
      <PageHeader
        title={isAsset ? t('tabs.assets') : t('title')}
        titleEn={isAsset ? 'Drug Assets' : 'Data Assets'}
        description={isAsset ? t('subtitle') : t('dataSubtitle')}
        size="md"
        actions={
          !showTypes ? (
            <div className="flex items-center gap-2">
              {/* 高频动作直出：转数据集 + 类型 + 新建记录(Contributor)；建类型(Manager)/批量导入(Contributor)收进「更多」。 */}
              {canCreate && activeType && (
                <Button variant="outline" onClick={() => setConvertOpen(true)}>
                  <Database className="size-4" />
                  {t('fromRegistry.button', {
                    ns: 'datasets',
                    defaultValue: '转数据集',
                  })}
                </Button>
              )}
              {/* 类型管理：放在「转数据集」右侧，所有成员可见；再次点击返回记录视图。 */}
              <Button variant="outline" onClick={() => setTab(TYPES_TAB)}>
                <Settings2 className="size-4" />
                {t('tabs.types')}
              </Button>
              {activeType && (
                <Button variant="outline" onClick={() => setTrashOpen(true)}>
                  <Trash2 className="size-4" />
                  {t('trash.recordsTitle')}
                  {typeof activeTrashCount === 'number' && activeTrashCount > 0
                    ? ` ${activeTrashCount}`
                    : null}
                </Button>
              )}
              {canCreateRecord &&
                activeType &&
                (isAsset ? (
                  <Button onClick={() => setCreateOpen(true)}>
                    <Plus className="size-4" />
                    {t('entities.create')}
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setCreateFromAssetOpen(true)}
                    >
                      <Database className="size-4" />
                      {t('entities.createFromAsset')}
                    </Button>
                    <Button onClick={() => setCreateOpen(true)}>
                      <Plus className="size-4" />
                      {t('entities.create')}
                    </Button>
                  </>
                ))}
              {canCreate && (canManage || (activeType && isAsset)) && (
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
                    {activeType && isAsset && (
                      <DropdownMenuItem onClick={() => setImportOpen(true)}>
                        <FileUp className="size-4" />
                        {t('import.button')}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          ) : undefined
        }
      />

      {showTypes ? (
        <div className="bg-card mb-4 flex items-center justify-between gap-3 rounded-[10px] border px-4 py-3">
          <div className="min-w-0">
            <div className="text-[13px] font-bold">
              {isAsset
                ? t('types.managingAssets')
                : t('types.managingTemplates')}
            </div>
            <div className="text-muted-foreground mt-0.5 text-[12px]">
              {t('types.manageHint')}
            </div>
          </div>
          {kindTypes.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setTab('')}>
              <ArrowLeft className="size-4" />
              {t('types.backToRecords')}
            </Button>
          )}
        </div>
      ) : activeType ? (
        <div className="bg-card mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[10px] border px-4 py-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="truncate text-[15px] font-bold">
                {activeType.name}
              </span>
              <span className="mono text-muted-foreground text-[11px]">
                {activeType.key}
              </span>
            </div>
            <div className="text-muted-foreground mt-0.5 text-[12px]">
              {t('types.currentHint', {
                fields: activeType.fields.length,
                records: activeTypeCount ?? '·',
              })}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFieldsOpen(true)}
          >
            <Eye className="size-4" />
            {t('types.viewFields')}
          </Button>
        </div>
      ) : null}

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
                  : 'text-muted-foreground hover:text-foreground border-transparent',
              )}
            >
              {ty.name}
              <span
                className={cn(
                  'rounded-full px-1.5 py-px text-[11px]',
                  on
                    ? 'bg-accent text-brand'
                    : 'text-muted-foreground bg-[#F0F2F6]',
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
          hint={
            isAsset ? t('entities.noAssetTypes') : t('entities.noTemplates')
          }
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
          recordCount={activeTypeCount}
          canCreate={canCreateRecord}
          isAsset={isAsset}
          onCreate={() => setCreateOpen(true)}
          onCreateFromAsset={() => setCreateFromAssetOpen(true)}
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
          {!isAsset && (
            <FromAssetRecordsDialog
              projectId={projectId}
              type={activeType}
              open={createFromAssetOpen}
              onOpenChange={setCreateFromAssetOpen}
            />
          )}
          <FromRegistryDialog
            projectId={projectId}
            type={activeType}
            canManage={canManage}
            open={convertOpen}
            onOpenChange={setConvertOpen}
          />
          <TypeFieldsDialog
            type={activeType}
            open={fieldsOpen}
            onOpenChange={setFieldsOpen}
          />
          <TrashRecordsDialog
            projectId={projectId}
            kind={kind}
            type={activeType}
            open={trashOpen}
            onOpenChange={setTrashOpen}
          />
        </>
      )}
    </div>
  )
}

function TrashRecordsDialog({
  projectId,
  kind,
  type,
  open,
  onOpenChange,
}: {
  projectId: string
  kind: TypeKind
  type: EntityType
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t, i18n } = useTranslation('registry')
  const [page, setPage] = useState({ limit: DEFAULT_PAGE_LIMIT, offset: 0 })
  const query = useRecords(
    projectId,
    kind,
    { type: type.id, deleted: true, ...page },
    open,
  )
  const access = useMyFieldAccess(projectId, kind, type.id)
  const restore = useRestoreRecord(projectId, kind)
  const purge = usePurgeRecord(projectId, kind)
  const qc = useQueryClient()
  const toastError = useToastError()
  const [clearOpen, setClearOpen] = useState(false)
  const [clearing, setClearing] = useState(false)
  const shown = type.fields.slice(0, 2)
  const canRestore = access.data?.can_update ?? false
  const canPurge = access.data?.can_delete ?? false

  const restoreRecord = (record: Entity) =>
    restore
      .mutateAsync({ id: record.id, version: record.version })
      .then(() => toast.success(t('trash.restored')))
      .catch(toastError)

  const purgeRecord = (record: Entity) =>
    purge
      .mutateAsync({ id: record.id, version: record.version })
      .then(() => toast.success(t('trash.purged')))
      .catch(toastError)

  const records = query.data?.items ?? []
  const total = query.data?.total ?? 0

  const clearTrash = async () => {
    setClearing(true)
    try {
      const all = await fetchAllTypeRecords(projectId, kind, type.id, true)
      for (const record of all) {
        await registryApi.purgeRecord(
          projectId,
          kind,
          record.id,
          record.version,
        )
      }
      await qc.invalidateQueries({ queryKey: ['registry', projectId] })
      toast.success(t('trash.clearDone', { count: all.length }))
      setClearOpen(false)
    } catch (error) {
      toastError(error)
    } finally {
      setClearing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[82vh] flex-col gap-3 sm:max-w-[760px]">
        <DialogHeader>
          <DialogTitle>{t('trash.recordsTitle')}</DialogTitle>
          <DialogDescription>
            {t('trash.desc', { name: type.name })}
          </DialogDescription>
        </DialogHeader>

        {canPurge && total > 0 && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={clearing}
              onClick={() => setClearOpen(true)}
            >
              <Trash2 className="size-4" />
              {t('trash.clear')}
            </Button>
          </div>
        )}

        {query.isLoading ? (
          <TableSkeleton rows={4} />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : records.length === 0 ? (
          <EmptyState title={t('trash.empty')} hint={t('trash.emptyHint')} />
        ) : (
          <TableCard>
            <div className="bg-surface-2 grid grid-cols-[120px_minmax(0,1fr)_180px] items-center border-b px-4 py-[11px]">
              <div className="th">ID</div>
              <div className="th">{t('drawer.fields')}</div>
              <div />
            </div>
            {records.map((record) => (
              <div
                key={record.id}
                className="border-divider grid grid-cols-[120px_minmax(0,1fr)_180px] items-center border-b px-4 py-3 text-[13px] last:border-b-0"
              >
                <div className="mono text-brand truncate text-[12px] font-semibold">
                  {shortId(record.id)}
                </div>
                <div className="text-muted-foreground min-w-0 truncate">
                  {shown.length === 0
                    ? t('trash.noPreview')
                    : shown
                        .map((field) => {
                          const value = record.data[field.name]
                          return `${fieldDisplayName(field, i18n.language)}: ${
                            value == null || value === '' ? '-' : String(value)
                          }`
                        })
                        .join(' · ')}
                </div>
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!canRestore || restore.isPending}
                    onClick={() => restoreRecord(record)}
                  >
                    <RotateCcw className="size-4" />
                    {t('trash.restore')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    disabled={!canPurge || purge.isPending}
                    onClick={() => purgeRecord(record)}
                  >
                    <Trash2 className="size-4" />
                    {t('trash.purge')}
                  </Button>
                </div>
              </div>
            ))}
            <GridFooter>
              <span>{t('table.total', { ns: 'common', total })}</span>
              <Pagination
                limit={page.limit}
                offset={page.offset}
                total={total}
                onChange={setPage}
              />
            </GridFooter>
          </TableCard>
        )}
        <ConfirmDialog
          open={clearOpen}
          onOpenChange={setClearOpen}
          title={t('trash.clearTitle')}
          description={t('trash.clearDesc', { name: type.name, count: total })}
          destructive
          confirmText={t('trash.clearConfirm', { count: total })}
          loading={clearing}
          onConfirm={clearTrash}
        />
      </DialogContent>
    </Dialog>
  )
}

function RecordsGrid({
  projectId,
  kind,
  type,
  recordCount,
  canCreate,
  isAsset,
  onCreate,
  onCreateFromAsset,
}: {
  projectId: string
  kind: TypeKind
  type: EntityType
  recordCount?: number
  canCreate: boolean
  isAsset: boolean
  onCreate: () => void
  onCreateFromAsset: () => void
}) {
  const { t, i18n } = useTranslation('registry')
  const [page, setPage] = useState({ limit: DEFAULT_PAGE_LIMIT, offset: 0 })
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const searchValue = debouncedSearch.trim()
  const [searchField, setSearchField] = useState('__all__')
  const [sort, setSort] = useState<GridSortState>(null)
  const [tableMode, setTableMode] = useState<'auto' | 'standard' | 'canvas'>(
    'auto',
  )
  const typeRecordCount = recordCount ?? 0
  const canvasPreferred =
    typeRecordCount > CANVAS_RECORD_THRESHOLD ||
    type.fields.length > CANVAS_FIELD_THRESHOLD
  const useCanvasGrid =
    tableMode === 'canvas' || (tableMode === 'auto' && canvasPreferred)
  const query = useRecords(projectId, kind, {
    type: type.id,
    search: searchValue || undefined,
    search_field: searchField === '__all__' ? undefined : searchField,
    sort: sort?.key,
    desc: sort?.desc,
    ...page,
  })
  const access = useMyFieldAccess(projectId, kind, type.id)
  const myAccessRequests = useMyFieldAccessRequests(
    projectId,
    kind,
    type.id,
    'pending',
  )
  const requestAccess = useRequestFieldAccess(projectId, kind, type.id)
  // 列级锁定字段：权威来自 my-field-access，不再靠「单元格值为空」猜。
  const lockedFields = new Set(access.data?.locked_fields ?? [])
  const requestedFields = new Set(
    (myAccessRequests.data ?? []).map((r) => r.field),
  )
  // 记录的改/删按钮按**有效权限**（角色 OR 细粒度授权）显示——之前错按 Manager 角色，贡献者/被授权者都看不到。
  const canUpdate = access.data?.can_update ?? false
  const canDelete = access.data?.can_delete ?? false
  const del = useDeleteRecord(projectId, kind)
  const qc = useQueryClient()
  const toastError = useToastError()
  const [selected, setSelected] = useState<Entity | null>(null)
  const [editTarget, setEditTarget] = useState<Entity | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Entity | null>(null)
  const [deleteAllOpen, setDeleteAllOpen] = useState(false)
  const [deletingAll, setDeletingAll] = useState(false)
  const [deleteAllCount, setDeleteAllCount] = useState<number | null>(null)

  useEffect(() => {
    setSearch('')
    setSearchField('__all__')
    setSort(null)
    setTableMode('auto')
    setPage((current) =>
      current.offset === 0 ? current : { ...current, offset: 0 },
    )
  }, [type.id])

  useEffect(() => {
    const pageSizeOptions = useCanvasGrid
      ? CANVAS_PAGE_SIZE_OPTIONS
      : DEFAULT_PAGE_SIZE_OPTIONS
    const preferredLimit = useCanvasGrid
      ? CANVAS_PAGE_LIMIT
      : DEFAULT_PAGE_LIMIT
    setPage((current) =>
      (pageSizeOptions as readonly number[]).includes(current.limit)
        ? current
        : { limit: preferredLimit, offset: 0 },
    )
  }, [useCanvasGrid])

  useEffect(() => {
    setPage((current) =>
      current.offset === 0 ? current : { ...current, offset: 0 },
    )
  }, [searchValue, searchField, sort?.key, sort?.desc])

  const shown = useCanvasGrid ? type.fields : type.fields.slice(0, 4)
  const shownKey = shown.map((field) => field.name).join('|')
  const searchFieldOptions = useMemo(
    () =>
      type.fields.map((field) => ({
        value: field.name,
        label: fieldDisplayName(field, i18n.language),
      })),
    [type.fields, i18n.language],
  )
  const columns = useMemo(
    () => [
      { id: '__id__', width: 108, min: 88, flex: 0.7 },
      ...shown.map((field) => ({
        id: field.name,
        width: 160,
        min: 120,
        flex: 1,
      })),
      { id: '__actions__', width: 48, flex: 0, resizable: false },
    ],
    [shownKey],
  )
  const {
    template: cols,
    startResize,
    widths,
  } = useResizableGridColumns(columns)
  const tableMinWidth = useMemo(
    () =>
      columns.reduce(
        (total, column) => total + (widths[column.id] ?? column.width),
        0,
      ),
    [columns, widths],
  )
  const tableGridStyle = useMemo(
    () => ({
      gridTemplateColumns: cols,
      minWidth: tableMinWidth,
      width: '100%',
    }),
    [cols, tableMinWidth],
  )
  const records = query.data?.items ?? []
  const total = query.data?.total ?? 0
  const effectiveRecordCount = recordCount ?? total

  // 引用字段：软引用存的是目标记录 uuid。把可见列里的引用解析成被引用记录的「name」，
  // 否则用户看到一串 uuid。ref_type 是目标资产类型 key → 找到其 type.id → 拉该类型记录建 id→name。
  // 引用字段：软引用存目标 uuid。解析成目标记录名 + 悬浮卡片（见 ReferenceValue，含权限脱敏）。
  const resolveRef = useRefResolver(projectId, shown)

  const onDelete = () => {
    if (!deleteTarget) return
    del
      .mutateAsync({ id: deleteTarget.id, version: deleteTarget.version })
      .then(() => {
        toast.success(t('entities.deleted'))
        setDeleteTarget(null)
      })
      .catch(toastError)
  }

  const onDeleteAll = async () => {
    setDeletingAll(true)
    try {
      const all = await fetchAllTypeRecords(projectId, kind, type.id)
      for (const record of all) {
        await registryApi.deleteRecord(
          projectId,
          kind,
          record.id,
          record.version,
        )
      }
      await qc.invalidateQueries({ queryKey: ['registry', projectId] })
      toast.success(t('entities.deleteAllDone', { count: all.length }))
      setDeleteAllOpen(false)
    } catch (error) {
      toastError(error)
    } finally {
      setDeletingAll(false)
      setDeleteAllCount(null)
    }
  }

  const openDeleteAll = async () => {
    setDeleteAllOpen(true)
    setDeleteAllCount(null)
    try {
      const all = await fetchAllTypeRecords(projectId, kind, type.id)
      setDeleteAllCount(all.length)
    } catch {
      setDeleteAllCount(null)
    }
  }

  const onRequestAccess = (field: string) =>
    requestAccess
      .mutateAsync({ field })
      .then(() => toast.success(t('accessRequests.requested')))
      .catch(toastError)

  if (query.isLoading) return <TableSkeleton rows={6} />
  if (query.isError)
    return <ErrorState error={query.error} onRetry={() => query.refetch()} />
  if (records.length === 0 && !searchValue && !sort)
    return (
      <EmptyState
        title={t('entities.empty')}
        hint={t('entities.emptyHint')}
        action={
          canCreate && isAsset ? (
            <Button onClick={onCreate}>
              <Plus className="size-4" />
              {t('entities.create')}
            </Button>
          ) : canCreate ? (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button variant="outline" onClick={onCreateFromAsset}>
                <Database className="size-4" />
                {t('entities.createFromAsset')}
              </Button>
              <Button onClick={onCreate}>
                <Plus className="size-4" />
                {t('entities.create')}
              </Button>
            </div>
          ) : undefined
        }
      />
    )

  return (
    <>
      <GridSearchToolbar
        value={search}
        onChange={setSearch}
        placeholder={t('entities.searchPlaceholder')}
        fieldValue={searchField}
        onFieldChange={setSearchField}
        fieldOptions={searchFieldOptions}
        allFieldsLabel={t('entities.allFields')}
        resultText={
          searchValue ? t('entities.searchResult', { total }) : undefined
        }
        actions={
          <>
            <div className="bg-card flex items-center rounded-lg border p-0.5">
              <Button
                type="button"
                variant={!useCanvasGrid ? 'default' : 'ghost'}
                size="xs"
                className="h-7 rounded-md px-2.5"
                onClick={() => setTableMode('standard')}
              >
                {t('entities.standardTable', {
                  defaultValue: '标准表格',
                })}
              </Button>
              <Button
                type="button"
                variant={useCanvasGrid ? 'default' : 'ghost'}
                size="xs"
                className="h-7 rounded-md px-2.5"
                onClick={() => setTableMode('canvas')}
              >
                {t('entities.canvasTable', {
                  defaultValue: '高性能表格',
                })}
              </Button>
            </div>
            {canDelete && effectiveRecordCount > 0 ? (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                disabled={deletingAll}
                title={t('entities.deleteAll')}
                aria-label={t('entities.deleteAll')}
                onClick={openDeleteAll}
              >
                <Trash2 className="size-4" />
                {t('entities.deleteAll')}
              </Button>
            ) : undefined}
          </>
        }
      />
      {records.length === 0 ? (
        <EmptyState
          title={t('entities.noMatches')}
          hint={t('entities.noMatchesHint')}
        />
      ) : useCanvasGrid ? (
        <CanvasRecordsTable
          fields={shown}
          records={records}
          total={total}
          page={page}
          pageSizeOptions={CANVAS_PAGE_SIZE_OPTIONS}
          sort={sort}
          lockedFields={lockedFields}
          language={i18n.language}
          onPageChange={setPage}
          onSortChange={setSort}
          onOpenRecord={setSelected}
          resolveRef={resolveRef}
        />
      ) : (
        <TableCard>
          <div className="overflow-x-auto">
            <div
              className="bg-surface-2 grid items-center border-b px-4 py-[11px]"
              style={tableGridStyle}
            >
              <div className="th relative min-w-0 pr-4">
                <GridSortButton
                  sortKey="__id__"
                  sort={sort}
                  onSortChange={setSort}
                  label={t('entities.sortColumn', { column: 'ID' })}
                >
                  ID
                </GridSortButton>
                <GridColumnResizeHandle
                  label={t('entities.resizeColumn', { column: 'ID' })}
                  onPointerDown={(event) => startResize('__id__', event)}
                />
              </div>
              {shown.map((f) => {
                const label = fieldDisplayName(f, i18n.language)
                return (
                  <div
                    key={f.name}
                    className="th relative flex min-w-0 items-center gap-1 truncate pr-4"
                  >
                    <GridSortButton
                      sortKey={f.name}
                      sort={sort}
                      onSortChange={setSort}
                      label={t('entities.sortColumn', { column: label })}
                    >
                      {label}
                    </GridSortButton>
                    {lockedFields.has(f.name) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        className="size-5 text-[#E0492C] hover:bg-[#FFF3F0] hover:text-[#E0492C]"
                        title={
                          requestedFields.has(f.name)
                            ? t('accessRequests.pending')
                            : t('accessRequests.requestTitle', {
                                field: label,
                              })
                        }
                        disabled={
                          requestedFields.has(f.name) || requestAccess.isPending
                        }
                        onClick={() => onRequestAccess(f.name)}
                      >
                        <Lock className="size-3" />
                      </Button>
                    )}
                    <GridColumnResizeHandle
                      label={t('entities.resizeColumn', {
                        column: label,
                      })}
                      onPointerDown={(event) => startResize(f.name, event)}
                    />
                  </div>
                )
              })}
              <div />
            </div>

            {records.map((r) => (
              <ContextMenu key={r.id}>
                <ContextMenuTrigger asChild>
                  <div
                    className="trow border-divider grid cursor-pointer items-center border-b px-4 py-3 text-[13px] last:border-b-0"
                    style={tableGridStyle}
                    onClick={() => setSelected(r)}
                  >
                    <div className="mono text-brand truncate text-[12px] font-semibold">
                      {shortId(r.id)}
                    </div>
                    {shown.map((f) => {
                      const v = r.data[f.name]
                      const locked = lockedFields.has(f.name)
                      const resolved =
                        f.type === 'reference' ? resolveRef(f, v) : null
                      return (
                        <div key={f.name} className="truncate pr-2">
                          {locked ? (
                            <MaskedValue />
                          ) : v == null || v === '' ? (
                            <span className="text-muted-foreground">—</span>
                          ) : resolved ? (
                            <ReferenceValue resolved={resolved} />
                          ) : (
                            <span
                              className={cn(
                                f.type === 'sequence' && 'mono text-[12px]',
                              )}
                            >
                              {String(v)}
                              {f.unit_symbol && (
                                <span className="text-muted-foreground ml-1 text-[11px] font-medium">
                                  {f.unit_symbol}
                                </span>
                              )}
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
                              <DropdownMenuItem
                                onClick={() => setEditTarget(r)}
                              >
                                <Pencil className="size-4" />
                                {t('entities.edit')}
                              </DropdownMenuItem>
                            )}
                            {canDelete && (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeleteTarget(r)}
                              >
                                <Trash2 className="size-4" />
                                {t('actions.delete', {
                                  ns: 'common',
                                  defaultValue: '删除',
                                })}
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
                      <ContextMenuItem
                        variant="destructive"
                        onClick={() => setDeleteTarget(r)}
                      >
                        <Trash2 className="size-4" />
                        {t('actions.delete', {
                          ns: 'common',
                          defaultValue: '删除',
                        })}
                      </ContextMenuItem>
                    </>
                  )}
                </ContextMenuContent>
              </ContextMenu>
            ))}
          </div>

          <GridFooter>
            <span>{t('table.total', { ns: 'common', total })}</span>
            <Pagination
              limit={page.limit}
              offset={page.offset}
              total={total}
              onChange={setPage}
              pageSizeOptions={DEFAULT_PAGE_SIZE_OPTIONS}
            />
          </GridFooter>
        </TableCard>
      )}

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
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={t('entities.deleteTitle')}
        description={t('entities.deleteDesc')}
        destructive
        confirmText={t('actions.delete', {
          ns: 'common',
          defaultValue: '删除',
        })}
        loading={del.isPending}
        onConfirm={onDelete}
      />
      <ConfirmDialog
        open={deleteAllOpen}
        onOpenChange={setDeleteAllOpen}
        title={t('entities.deleteAllTitle')}
        description={t('entities.deleteAllDesc', {
          name: type.name,
          count: deleteAllCount ?? total,
        })}
        destructive
        confirmText={t('entities.deleteAllConfirm', {
          count: deleteAllCount ?? total,
        })}
        loading={deletingAll}
        onConfirm={onDeleteAll}
      />
    </>
  )
}

function CanvasRecordsTable({
  fields,
  records,
  total,
  page,
  pageSizeOptions,
  sort,
  lockedFields,
  language,
  onPageChange,
  onSortChange,
  onOpenRecord,
  resolveRef,
}: {
  fields: FieldDef[]
  records: Entity[]
  total: number
  page: { limit: number; offset: number }
  pageSizeOptions: readonly number[]
  sort: GridSortState
  lockedFields: Set<string>
  language: string
  onPageChange: (page: { limit: number; offset: number }) => void
  onSortChange: (next: GridSortState) => void
  onOpenRecord: (record: Entity) => void
  resolveRef: (field: FieldDef, value: unknown) => { name: string } | null
}) {
  const { t } = useTranslation('registry')
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [viewportWidth, setViewportWidth] = useState(0)
  const [hoverRow, setHoverRow] = useState<number | null>(null)
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  const [resizing, setResizing] = useState<{
    id: string
    startX: number
    startWidth: number
  } | null>(null)

  const fieldKey = fields.map((field) => field.name).join('|')
  useEffect(() => {
    setColumnWidths({})
    setHoverRow(null)
  }, [fieldKey])

  useEffect(() => {
    const node = scrollRef.current
    if (!node) return
    const update = () => setViewportWidth(node.clientWidth)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const columns = useMemo(() => {
    const dataColumns = fields.map((field) => {
      const baseWidth =
        field.type === 'sequence'
          ? 420
          : field.type === 'text'
            ? 280
            : field.type === 'reference'
              ? 220
              : 180
      return {
        id: field.name,
        label: fieldDisplayName(field, language),
        field,
        width: columnWidths[field.name] ?? baseWidth,
        min: 120,
      }
    })
    return [
      {
        id: '__id__',
        label: 'ID',
        field: null,
        width: columnWidths.__id__ ?? 132,
        min: 92,
      },
      ...dataColumns,
    ]
  }, [columnWidths, fields, language])

  const tableWidth = Math.max(
    viewportWidth,
    columns.reduce((sum, column) => sum + column.width, 0),
  )
  const headerHeight = 40
  const rowHeight = 40
  const tableHeight = headerHeight + Math.max(records.length, 1) * rowHeight

  const columnStarts = useMemo(() => {
    const starts: number[] = []
    let next = 0
    for (const column of columns) {
      starts.push(next)
      next += column.width
    }
    return starts
  }, [columns])

  const getColumnIndexAt = (x: number) => {
    for (let index = 0; index < columns.length; index += 1) {
      const start = columnStarts[index]
      const end = start + columns[index].width
      if (x >= start && x <= end) return index
    }
    return -1
  }

  const getResizeColumnAt = (x: number) => {
    for (let index = 0; index < columns.length; index += 1) {
      const end = columnStarts[index] + columns[index].width
      if (Math.abs(x - end) <= 5) return columns[index]
    }
    return null
  }

  const getCanvasPoint = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
  }

  useEffect(() => {
    if (!resizing) return
    const previousCursor = document.body.style.cursor
    const previousUserSelect = document.body.style.userSelect
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const onPointerMove = (event: PointerEvent) => {
      const nextWidth = Math.max(
        72,
        resizing.startWidth + event.clientX - resizing.startX,
      )
      setColumnWidths((current) => ({ ...current, [resizing.id]: nextWidth }))
    }
    const onPointerUp = () => {
      document.body.style.cursor = previousCursor
      document.body.style.userSelect = previousUserSelect
      setResizing(null)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp, { once: true })
    return () => {
      document.body.style.cursor = previousCursor
      document.body.style.userSelect = previousUserSelect
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [resizing])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = window.devicePixelRatio || 1
    const width = Math.max(1, tableWidth)
    const height = Math.max(1, tableHeight)
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const css = getComputedStyle(document.documentElement)
    const color = (name: string, fallback: string) =>
      css.getPropertyValue(name).trim() || fallback
    const card = color('--card', '#ffffff')
    const surface = color('--surface-2', '#fafbfd')
    const divider = color('--divider', '#f1f3f7')
    const border = color('--border', '#e9edf4')
    const foreground = color('--foreground', '#1b2330')
    const muted = color('--muted-foreground', '#727d8d')
    const brand = color('--brand', '#2f6bff')
    const hover = 'rgba(47, 107, 255, 0.06)'

    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = card
    ctx.fillRect(0, 0, width, height)

    ctx.fillStyle = surface
    ctx.fillRect(0, 0, width, headerHeight)
    ctx.strokeStyle = border
    ctx.beginPath()
    ctx.moveTo(0, headerHeight + 0.5)
    ctx.lineTo(width, headerHeight + 0.5)
    ctx.stroke()

    ctx.font = '600 11px Inter, ui-sans-serif, system-ui, sans-serif'
    ctx.textBaseline = 'middle'
    columns.forEach((column, index) => {
      const x = columnStarts[index]
      const active =
        sort?.key === (column.id === '__id__' ? '__id__' : column.id)
      ctx.save()
      ctx.beginPath()
      ctx.rect(x + 16, 0, column.width - 28, headerHeight)
      ctx.clip()
      ctx.fillStyle = active ? brand : muted
      ctx.fillText(
        `${column.label.toUpperCase()} ${active ? (sort?.desc ? '↓' : '↑') : '↕'}`,
        x + 16,
        headerHeight / 2,
      )
      ctx.restore()

      ctx.strokeStyle = border
      ctx.beginPath()
      ctx.moveTo(x + column.width + 0.5, 12)
      ctx.lineTo(x + column.width + 0.5, headerHeight - 12)
      ctx.stroke()
    })

    records.forEach((record, rowIndex) => {
      const y = headerHeight + rowIndex * rowHeight
      if (hoverRow === rowIndex) {
        ctx.fillStyle = hover
        ctx.fillRect(0, y, width, rowHeight)
      }
      ctx.strokeStyle = divider
      ctx.beginPath()
      ctx.moveTo(0, y + rowHeight + 0.5)
      ctx.lineTo(width, y + rowHeight + 0.5)
      ctx.stroke()

      columns.forEach((column, columnIndex) => {
        const x = columnStarts[columnIndex]
        const value =
          column.id === '__id__'
            ? shortId(record.id)
            : getCanvasCellValue(record, column.field, lockedFields, resolveRef)
        ctx.save()
        ctx.beginPath()
        ctx.rect(x + 16, y, Math.max(0, column.width - 24), rowHeight)
        ctx.clip()
        ctx.fillStyle = column.id === '__id__' ? brand : foreground
        ctx.font =
          column.id === '__id__' || column.field?.type === 'sequence'
            ? '600 12px ui-monospace, SFMono-Regular, Menlo, monospace'
            : '500 13px Inter, ui-sans-serif, system-ui, sans-serif'
        ctx.fillText(value, x + 16, y + rowHeight / 2)
        ctx.restore()
      })
    })

    if (records.length === 0) {
      ctx.fillStyle = muted
      ctx.font = '500 13px Inter, ui-sans-serif, system-ui, sans-serif'
      ctx.fillText(t('entities.noMatches'), 16, headerHeight + rowHeight / 2)
    }
  }, [
    columnStarts,
    columns,
    hoverRow,
    lockedFields,
    records,
    resolveRef,
    sort,
    t,
    tableHeight,
    tableWidth,
  ])

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const point = getCanvasPoint(event)
    if (point.y < headerHeight && getResizeColumnAt(point.x)) {
      event.currentTarget.style.cursor = 'col-resize'
      setHoverRow(null)
      return
    }
    event.currentTarget.style.cursor =
      point.y < headerHeight ? 'pointer' : 'default'
    if (point.y < headerHeight) {
      setHoverRow(null)
      return
    }
    const rowIndex = Math.floor((point.y - headerHeight) / rowHeight)
    setHoverRow(rowIndex >= 0 && rowIndex < records.length ? rowIndex : null)
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const point = getCanvasPoint(event)
    if (point.y >= headerHeight) return
    const column = getResizeColumnAt(point.x)
    if (!column) return
    event.preventDefault()
    setResizing({
      id: column.id,
      startX: event.clientX,
      startWidth: column.width,
    })
  }

  const handleClick = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (resizing) return
    const point = getCanvasPoint(event)
    if (point.y < headerHeight) {
      if (getResizeColumnAt(point.x)) return
      const columnIndex = getColumnIndexAt(point.x)
      const column = columns[columnIndex]
      if (!column) return
      const key = column.id === '__id__' ? '__id__' : column.id
      onSortChange(nextCanvasSort(sort, key))
      return
    }
    const rowIndex = Math.floor((point.y - headerHeight) / rowHeight)
    const record = records[rowIndex]
    if (record) onOpenRecord(record)
  }

  return (
    <TableCard>
      <div className="border-divider bg-surface-2 text-muted-foreground border-b px-4 py-2 text-[12px]">
        {t('entities.canvasTableHint', {
          defaultValue:
            '高性能 Canvas 表格：适合大量记录和宽字段浏览，点击行打开详情。',
        })}
      </div>
      <div
        ref={scrollRef}
        className="max-h-[620px] min-h-[280px] overflow-auto"
        onMouseLeave={() => setHoverRow(null)}
      >
        <canvas
          ref={canvasRef}
          role="grid"
          aria-label={t('entities.canvasTable', {
            defaultValue: '高性能表格',
          })}
          className="block"
          onClick={handleClick}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
        />
      </div>
      <GridFooter>
        <span>{t('table.total', { ns: 'common', total })}</span>
        <Pagination
          limit={page.limit}
          offset={page.offset}
          total={total}
          onChange={onPageChange}
          pageSizeOptions={pageSizeOptions}
        />
      </GridFooter>
    </TableCard>
  )
}

function nextCanvasSort(current: GridSortState, key: string): GridSortState {
  if (current?.key !== key) return { key, desc: false }
  if (!current.desc) return { key, desc: true }
  return null
}

function getCanvasCellValue(
  record: Entity,
  field: FieldDef | null,
  lockedFields: Set<string>,
  resolveRef: (field: FieldDef, value: unknown) => { name: string } | null,
) {
  if (!field) return shortId(record.id)
  if (lockedFields.has(field.name)) return '*****'
  const value = record.data[field.name]
  if (value == null || value === '') return '-'
  const resolved = field.type === 'reference' ? resolveRef(field, value) : null
  const text = resolved ? resolved.name : String(value)
  return field.unit_symbol ? `${text} ${field.unit_symbol}` : text
}

async function fetchAllTypeRecords(
  projectId: string,
  kind: TypeKind,
  typeId: string,
  deleted = false,
) {
  const out: Entity[] = []
  let offset = 0
  let total = 0
  do {
    const page = await registryApi.listRecords(projectId, kind, {
      type: typeId,
      ...(deleted ? { deleted: true } : {}),
      limit: 100,
      offset,
    })
    out.push(...page.items)
    total = page.total
    offset += page.limit || 100
  } while (out.length < total)
  return out
}
