import { useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  Boxes,
  Eye,
  FlaskConical,
  Link2,
  Pencil,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, GridSkeleton } from '@/components/states'
import { ConfirmDialog } from '@/components/confirm-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useProjectRole } from '@/hooks/use-projects'
import {
  useDeletedEntityTypes,
  useDeleteType,
  useEntityTypes,
  usePurgeType,
  useRestoreType,
} from '@/hooks/use-registry'
import { useToastError } from '@/hooks/use-toast-error'
import { roleAtLeast } from '@/lib/roles'
import {
  entityTypeDisplayName,
  registryApi,
  type EntityType,
  type TypeKind,
} from '@/api/registry'
import { ResourceGrantsDialog } from '@/features/grants/ResourceGrantsDialog'
import { EntityTypeDialog } from './EntityTypeDialog'
import { FieldGrantsDialog } from './FieldGrantsDialog'
import { ImportTypesDialog } from './ImportTypesDialog'
import { TypeFieldsDialog } from './TypeFieldsDialog'

/** 类型管理：药物资产类型 + 数据模版（卡片网格）。kindFilter 限定只管理一种。 */
export function EntityTypesPanel({
  projectId,
  kindFilter,
}: {
  projectId: string
  kindFilter?: TypeKind
}) {
  const { t, i18n } = useTranslation('registry')
  const role = useProjectRole(projectId)
  const canManage = roleAtLeast(role, 'manager')
  const query = useEntityTypes(projectId)
  const del = useDeleteType(projectId)
  const toastError = useToastError()

  const [createKind, setCreateKind] = useState<TypeKind | null>(null)
  const [editTarget, setEditTarget] = useState<EntityType | null>(null)
  const [viewTarget, setViewTarget] = useState<EntityType | null>(null)
  const [grantsTarget, setGrantsTarget] = useState<EntityType | null>(null)
  const [collabTarget, setCollabTarget] = useState<EntityType | null>(null)
  const [delTarget, setDelTarget] = useState<EntityType | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [trashOpen, setTrashOpen] = useState(false)

  const all = query.data ?? []
  const recordCountQueries = useQueries({
    queries: all.map((ty) => ({
      queryKey: ['registry', projectId, 'type-record-count', ty.kind, ty.id],
      queryFn: async () => {
        const page = await registryApi.listRecords(projectId, ty.kind, {
          type: ty.id,
          limit: 1,
          offset: 0,
        })
        return page.total
      },
      enabled: !!projectId,
      staleTime: 30_000,
    })),
  })
  const recordCountById = new Map(
    all.map((ty, index) => [ty.id, recordCountQueries[index]?.data]),
  )

  const onDelete = () => {
    if (!delTarget) return
    del
      .mutateAsync({
        kind: delTarget.kind,
        typeId: delTarget.id,
        version: delTarget.version,
      })
      .then(() => {
        toast.success(t('types.deleted'))
        setDelTarget(null)
      })
      .catch(toastError)
  }

  const assets = all.filter((ty) => ty.kind === 'asset')
  const templates = all.filter((ty) => ty.kind === 'template')
  const nameOf = (id: string) => {
    const ty = all.find((ty) => ty.id === id)
    return ty ? entityTypeDisplayName(ty, i18n.language) : id
  }

  const section = (
    title: string,
    kind: TypeKind,
    items: EntityType[],
    compact = false,
  ) => (
    <div className="space-y-3">
      {!compact && (
        <div className="flex items-center justify-between">
          <h3 className="text-[14px] font-bold">{title}</h3>
          {canManage && (
            <Button variant="outline" size="sm" onClick={() => setCreateKind(kind)}>
              <Plus className="size-4" />
              {t(kind === 'asset' ? 'types.createAsset' : 'types.createTemplate')}
            </Button>
          )}
        </div>
      )}
      {compact && canManage && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setTrashOpen(true)}>
            <Trash2 className="size-4" />
            {t('typeTrash.title')}
          </Button>
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Sparkles className="size-4" />
            {t('types.seed')}
          </Button>
          <Button variant="outline" onClick={() => setCreateKind(kind)}>
            <Plus className="size-4" />
            {t(kind === 'asset' ? 'types.createAsset' : 'types.createTemplate')}
          </Button>
        </div>
      )}
      {items.length === 0 ? (
        <p className="rounded-[11px] border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
          {t('types.emptyKind')}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((ty) => (
            <TypeCard
              key={ty.id}
              ty={ty}
              boundName={nameOf}
              recordCount={recordCountById.get(ty.id)}
              canManage={canManage}
              onView={() => setViewTarget(ty)}
              onEdit={() => setEditTarget(ty)}
              onGrants={() => setGrantsTarget(ty)}
              onCollab={() => setCollabTarget(ty)}
              onDelete={() => setDelTarget(ty)}
            />
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      {!kindFilter && (
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-bold">{t('types.title')}</h2>
          {canManage && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setTrashOpen(true)}>
                <Trash2 className="size-4" />
                {t('typeTrash.title')}
              </Button>
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <Sparkles className="size-4" />
                {t('types.seed')}
              </Button>
            </div>
          )}
        </div>
      )}

      {query.isLoading ? (
        <GridSkeleton count={3} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : all.length === 0 && !canManage ? (
        <EmptyState title={t('types.empty')} hint={t('types.emptyDesc')} />
      ) : (
        <>
          {(!kindFilter || kindFilter === 'asset') &&
            section(t('types.assetTypes'), 'asset', assets, kindFilter === 'asset')}
          {(!kindFilter || kindFilter === 'template') &&
            section(
              t('types.dataTemplates'),
              'template',
              templates,
              kindFilter === 'template',
            )}
        </>
      )}

      <ImportTypesDialog
        projectId={projectId}
        kindFilter={kindFilter}
        open={importOpen}
        onOpenChange={setImportOpen}
      />
      <TypeTrashDialog
        projectId={projectId}
        kindFilter={kindFilter}
        open={trashOpen}
        onOpenChange={setTrashOpen}
      />
      <EntityTypeDialog
        projectId={projectId}
        kind={createKind ?? 'asset'}
        open={!!createKind}
        onOpenChange={(o) => !o && setCreateKind(null)}
      />
      <EntityTypeDialog
        projectId={projectId}
        kind={editTarget?.kind ?? 'asset'}
        open={!!editTarget}
        onOpenChange={(o) => !o && setEditTarget(null)}
        type={editTarget}
      />
      <TypeFieldsDialog
        type={viewTarget}
        open={!!viewTarget}
        onOpenChange={(o) => !o && setViewTarget(null)}
      />
      {grantsTarget && (
        <FieldGrantsDialog
          projectId={projectId}
          type={grantsTarget}
          open={!!grantsTarget}
          onOpenChange={(o) => !o && setGrantsTarget(null)}
        />
      )}
      {collabTarget && (
        <ResourceGrantsDialog
          resourceType={collabTarget.kind === 'asset' ? 'asset_type' : 'template_type'}
          resourceId={collabTarget.id}
          projectId={projectId}
          name={collabTarget.name}
          open={!!collabTarget}
          onOpenChange={(o) => !o && setCollabTarget(null)}
        />
      )}
      <ConfirmDialog
        open={!!delTarget}
        onOpenChange={(o) => !o && setDelTarget(null)}
        title={t('types.delete')}
        description={t('types.deleteDesc', {
          name: delTarget ? entityTypeDisplayName(delTarget, i18n.language) : '',
        })}
        destructive
        confirmText={t('types.delete')}
        loading={del.isPending}
        onConfirm={onDelete}
      />
    </div>
  )
}

function TypeTrashDialog({
  projectId,
  kindFilter,
  open,
  onOpenChange,
}: {
  projectId: string
  kindFilter?: TypeKind
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation('registry')
  const query = useDeletedEntityTypes(projectId, open)
  const restore = useRestoreType(projectId)
  const purge = usePurgeType(projectId)
  const toastError = useToastError()
  const items = (query.data ?? []).filter((ty) => !kindFilter || ty.kind === kindFilter)

  const restoreType = (ty: EntityType) =>
    restore
      .mutateAsync({ kind: ty.kind, typeId: ty.id, version: ty.version })
      .then(() => toast.success(t('typeTrash.restored')))
      .catch(toastError)

  const purgeType = (ty: EntityType) =>
    purge
      .mutateAsync({ kind: ty.kind, typeId: ty.id, version: ty.version })
      .then(() => toast.success(t('typeTrash.purged')))
      .catch(toastError)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[82vh] flex-col gap-3 sm:max-w-[760px]">
        <DialogHeader>
          <DialogTitle>{t('typeTrash.title')}</DialogTitle>
          <DialogDescription>{t('typeTrash.desc')}</DialogDescription>
        </DialogHeader>

        {query.isLoading ? (
          <GridSkeleton count={3} />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : items.length === 0 ? (
          <EmptyState title={t('typeTrash.empty')} hint={t('typeTrash.emptyHint')} />
        ) : (
          <div className="space-y-2 overflow-auto pr-1">
            {items.map((ty) => {
              const Icon = ty.kind === 'asset' ? FlaskConical : Boxes
              return (
                <div
                  key={ty.id}
                  className="flex items-center gap-3 rounded-[10px] border bg-card px-3 py-2.5"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted-foreground">
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-bold">{ty.name}</div>
                    <div className="mono truncate text-[11px] text-muted-foreground">
                      {ty.key} · {t(ty.kind === 'asset' ? 'tabs.assets' : 'title')}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={restore.isPending}
                      onClick={() => restoreType(ty)}
                    >
                      <RotateCcw className="size-4" />
                      {t('typeTrash.restore')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      disabled={purge.isPending}
                      onClick={() => purgeType(ty)}
                    >
                      <Trash2 className="size-4" />
                      {t('typeTrash.purge')}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function TypeCard({
  ty,
  boundName,
  recordCount,
  canManage,
  onView,
  onEdit,
  onGrants,
  onCollab,
  onDelete,
}: {
  ty: EntityType
  boundName: (id: string) => string
  recordCount?: number
  canManage: boolean
  onView: () => void
  onEdit: () => void
  onGrants: () => void
  onCollab: () => void
  onDelete: () => void
}) {
  const { t, i18n } = useTranslation('registry')
  const sensitive = ty.fields.filter((f) => f.sensitive).length
  const displayName = entityTypeDisplayName(ty, i18n.language)
  const Icon = ty.kind === 'asset' ? FlaskConical : Boxes
  const tint = ty.kind === 'asset' ? ['#EAF0FF', '#2F6BFF'] : ['#EEF0F3', '#64748B']

  return (
    <div className="card-shadow rounded-[14px] border bg-card p-4">
      <div className="flex items-center gap-2.5">
        <div
          className="flex size-8 shrink-0 items-center justify-center rounded-lg"
          style={{ background: tint[0], color: tint[1] }}
        >
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13.5px] font-bold">{displayName}</div>
          <div className="mono truncate text-[11px] text-muted-foreground">
            {ty.key}
          </div>
        </div>
      </div>
      {ty.description && (
        <p className="mt-3 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">
          {ty.description}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
        <span>{t('types.fieldCount', { count: ty.fields.length })}</span>
        {typeof recordCount === 'number' && (
          <span>· {t('types.recordCount', { count: recordCount })}</span>
        )}
        {sensitive > 0 && (
          <span className="text-[#B45309]">
            · {t('types.sensitiveCount', { count: sensitive })}
          </span>
        )}
        {ty.bound_asset_type_id && (
          <Badge variant="outline" className="gap-1">
            <Link2 className="size-3" />
            {boundName(ty.bound_asset_type_id)}
          </Badge>
        )}
      </div>
      <div className="mt-2 flex justify-end gap-1">
        <Button variant="ghost" size="icon-sm" title={t('types.viewFields')} onClick={onView}>
          <Eye className="size-4" />
        </Button>
        {canManage && (
          <>
          <Button variant="ghost" size="icon-sm" title={t('grants.title')} onClick={onCollab}>
            <Users className="size-4" />
          </Button>
          {sensitive > 0 && (
            <Button
              variant="ghost"
              size="icon-sm"
              title={t('types.grants')}
              onClick={onGrants}
            >
              <ShieldCheck className="size-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon-sm" onClick={onEdit}>
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            title={t('types.delete')}
            className="text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="size-4" />
          </Button>
          </>
        )}
      </div>
    </div>
  )
}
