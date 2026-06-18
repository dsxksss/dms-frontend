import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  Boxes,
  FlaskConical,
  Link2,
  Pencil,
  Plus,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, GridSkeleton } from '@/components/states'
import { useProjectRole } from '@/hooks/use-projects'
import { useEntityTypes, useSeedDrugRd } from '@/hooks/use-registry'
import { useToastError } from '@/hooks/use-toast-error'
import { roleAtLeast } from '@/lib/roles'
import type { EntityType, TypeKind } from '@/api/registry'
import { ResourceGrantsDialog } from '@/features/grants/ResourceGrantsDialog'
import { EntityTypeDialog } from './EntityTypeDialog'
import { FieldGrantsDialog } from './FieldGrantsDialog'

/** 类型管理：药物资产类型 + 数据模版（卡片网格）。kindFilter 限定只管理一种。 */
export function EntityTypesPanel({
  projectId,
  kindFilter,
}: {
  projectId: string
  kindFilter?: TypeKind
}) {
  const { t } = useTranslation('registry')
  const role = useProjectRole(projectId)
  const canManage = roleAtLeast(role, 'manager')
  const query = useEntityTypes(projectId)
  const seed = useSeedDrugRd(projectId)
  const toastError = useToastError()

  const [createKind, setCreateKind] = useState<TypeKind | null>(null)
  const [editTarget, setEditTarget] = useState<EntityType | null>(null)
  const [grantsTarget, setGrantsTarget] = useState<EntityType | null>(null)
  const [collabTarget, setCollabTarget] = useState<EntityType | null>(null)

  const all = query.data ?? []
  const assets = all.filter((ty) => ty.kind === 'asset')
  const templates = all.filter((ty) => ty.kind === 'template')
  const nameOf = (id: string) => all.find((ty) => ty.id === id)?.name ?? id

  const onSeed = () =>
    seed
      .mutateAsync()
      .then((types) => toast.success(t('types.seeded', { count: types.length })))
      .catch(toastError)

  const section = (title: string, kind: TypeKind, items: EntityType[]) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-bold">{title}</h3>
        {canManage && (
          <Button variant="outline" size="sm" onClick={() => setCreateKind(kind)}>
            <Plus className="size-4" />
            {t(kind === 'asset' ? 'types.createAsset' : 'types.createTemplate')}
          </Button>
        )}
      </div>
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
              canManage={canManage}
              onEdit={() => setEditTarget(ty)}
              onGrants={() => setGrantsTarget(ty)}
              onCollab={() => setCollabTarget(ty)}
            />
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-bold">{t('types.title')}</h2>
        {canManage && (
          <Button variant="outline" onClick={onSeed} disabled={seed.isPending}>
            <Sparkles className="size-4" />
            {t('types.seed')}
          </Button>
        )}
      </div>

      {query.isLoading ? (
        <GridSkeleton count={3} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : all.length === 0 && !canManage ? (
        <EmptyState title={t('types.empty')} hint={t('types.emptyDesc')} />
      ) : (
        <>
          {(!kindFilter || kindFilter === 'asset') &&
            section(t('types.assetTypes'), 'asset', assets)}
          {(!kindFilter || kindFilter === 'template') &&
            section(t('types.dataTemplates'), 'template', templates)}
        </>
      )}

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
          name={collabTarget.name}
          open={!!collabTarget}
          onOpenChange={(o) => !o && setCollabTarget(null)}
        />
      )}
    </div>
  )
}

function TypeCard({
  ty,
  boundName,
  canManage,
  onEdit,
  onGrants,
  onCollab,
}: {
  ty: EntityType
  boundName: (id: string) => string
  canManage: boolean
  onEdit: () => void
  onGrants: () => void
  onCollab: () => void
}) {
  const { t } = useTranslation('registry')
  const sensitive = ty.fields.filter((f) => f.sensitive).length
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
          <div className="truncate text-[13.5px] font-bold">{ty.name}</div>
          <div className="mono truncate text-[11px] text-muted-foreground">
            {ty.key}
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
        <span>{t('types.fieldCount', { count: ty.fields.length })}</span>
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
      {canManage && (
        <div className="mt-2 flex justify-end gap-1">
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
        </div>
      )}
    </div>
  )
}
