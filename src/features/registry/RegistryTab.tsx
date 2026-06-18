import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueries } from '@tanstack/react-query'
import { toast } from 'sonner'
import { FileUp, MoreHorizontal, Pencil, Plus, Trash2, Wand2 } from 'lucide-react'
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
import { useEntityTypes, useRecords, useDeleteRecord } from '@/hooks/use-registry'
import { useToastError } from '@/hooks/use-toast-error'
import { registryApi } from '@/api/registry'
import type { Entity, EntityType, TypeKind } from '@/api/registry'
import { MaskedValue } from './MaskedValue'
import { AssetDrawer } from './AssetDrawer'
import { EntityDialog } from './EntityDialog'
import { EntityTypeDialog } from './EntityTypeDialog'
import { ImportEntitiesDialog } from './ImportEntitiesDialog'
import { EntityTypesPanel } from './EntityTypesPanel'

type View = 'assets' | 'data' | 'types'

/** 数据资产主面板：药物资产 / 药物数据 / 类型 + 动态记录网格 + 详情抽屉。 */
export function RegistryTab({ projectId }: { projectId: string }) {
  const { t } = useTranslation('registry')
  const role = useProjectRole(projectId)
  const canCreate = roleAtLeast(role, 'contributor')
  const canManage = roleAtLeast(role, 'manager')
  const types = useEntityTypes(projectId)
  const [view, setView] = useState<View>('assets')
  const [typeId, setTypeId] = useState('')
  const [createTypeOpen, setCreateTypeOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  const kind: TypeKind = view === 'data' ? 'template' : 'asset'
  const kindTypes = (types.data ?? []).filter((ty) => ty.kind === kind)
  const activeType = kindTypes.find((ty) => ty.id === typeId) ?? kindTypes[0]

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

  const MAIN_TABS: { key: View; label: string }[] = [
    { key: 'assets', label: t('tabs.assets') },
    { key: 'data', label: t('tabs.data') },
    { key: 'types', label: t('tabs.types') },
  ]

  return (
    <div className="px-[26px] py-[22px]">
      <PageHeader
        title={t('title')}
        titleEn="Data Assets"
        description={t('subtitle')}
        size="md"
        actions={
          canManage && (
            <>
              <Button variant="outline" onClick={() => setCreateTypeOpen(true)}>
                <Wand2 className="size-4" />
                {t('types.createAsset')}
              </Button>
              {view !== 'types' && activeType && (
                <Button variant="outline" onClick={() => setImportOpen(true)}>
                  <FileUp className="size-4" />
                  {t('import.button')}
                </Button>
              )}
              {view !== 'types' && activeType && canCreate && (
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="size-4" />
                  {t('entities.create')}
                </Button>
              )}
            </>
          )
        }
      />

      {/* main view tabs */}
      <div className="mb-4 flex items-center gap-1 border-b">
        {MAIN_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setView(tab.key)}
            className={cn(
              '-mb-px border-b-2 px-3.5 py-2.5 text-[13px] font-semibold transition',
              view === tab.key
                ? 'border-brand text-brand'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {view === 'types' ? (
        <EntityTypesPanel projectId={projectId} />
      ) : kindTypes.length === 0 ? (
        <EmptyState
          title={t('types.empty')}
          hint={view === 'data' ? t('entities.noTemplates') : t('entities.noAssetTypes')}
        />
      ) : (
        <>
          {/* type sub-tabs with count pills */}
          <div className="mb-4 flex flex-wrap items-center gap-1.5 border-b">
            {kindTypes.map((ty, i) => {
              const on = activeType?.id === ty.id
              return (
                <button
                  key={ty.id}
                  type="button"
                  onClick={() => setTypeId(ty.id)}
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

          {activeType && (
            <RecordsGrid
              projectId={projectId}
              kind={kind}
              type={activeType}
              canManage={canManage}
            />
          )}
        </>
      )}

      {/* dialogs */}
      <EntityTypeDialog
        projectId={projectId}
        kind="asset"
        open={createTypeOpen}
        onOpenChange={setCreateTypeOpen}
      />
      {activeType && (
        <>
          <ImportEntitiesDialog
            projectId={projectId}
            typeId={activeType.id}
            open={importOpen}
            onOpenChange={setImportOpen}
          />
          <EntityDialog
            projectId={projectId}
            kind={kind}
            type={activeType}
            open={createOpen}
            onOpenChange={setCreateOpen}
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
}: {
  projectId: string
  kind: TypeKind
  type: EntityType
  canManage: boolean
}) {
  const { t } = useTranslation('registry')
  const [page, setPage] = useState({ limit: 20, offset: 0 })
  const query = useRecords(projectId, kind, { type: type.id, ...page })
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
  if (records.length === 0) return <EmptyState title={t('entities.empty')} />

  return (
    <>
      <TableCard>
        <div
          className="grid items-center border-b bg-surface-2 px-4 py-[11px]"
          style={{ gridTemplateColumns: cols }}
        >
          <div className="th">ID</div>
          {shown.map((f) => (
            <div key={f.name} className="th truncate">
              {f.name}
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
              const masked = f.sensitive && (v == null || v === '')
              return (
                <div key={f.name} className="truncate pr-2">
                  {masked ? (
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
