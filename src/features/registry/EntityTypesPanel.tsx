import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Boxes, FlaskConical, KeyRound, Link2, Pencil, Plus, ShieldCheck, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { EmptyState, ErrorState, TableSkeleton } from '@/components/states'
import { useProjectRole } from '@/hooks/use-projects'
import { useEntityTypes, useSeedDrugRd } from '@/hooks/use-registry'
import { useToastError } from '@/hooks/use-toast-error'
import { roleAtLeast } from '@/lib/roles'
import type { EntityType, TypeKind } from '@/api/registry'
import { EntityTypeDialog } from './EntityTypeDialog'
import { FieldGrantsDialog } from './FieldGrantsDialog'

function TypeCard({
  ty,
  typeName,
  canManage,
  onEdit,
  onGrants,
}: {
  ty: EntityType
  typeName: (id: string) => string
  canManage: boolean
  onEdit: () => void
  onGrants: () => void
}) {
  const { t } = useTranslation('registry')
  const sensitiveCount = ty.fields.filter((f) => f.sensitive).length
  const Icon = ty.kind === 'asset' ? FlaskConical : Boxes
  return (
    <Card className="hover:border-brand/40 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <div
              className={
                ty.kind === 'asset'
                  ? 'bg-brand/10 text-brand flex size-8 shrink-0 items-center justify-center rounded-md'
                  : 'bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-md'
              }
            >
              <Icon className="size-4" />
            </div>
            <div className="min-w-0">
              <div className="truncate font-medium">{ty.name}</div>
              <div className="text-muted-foreground flex items-center gap-1 font-mono text-xs">
                <KeyRound className="size-3" />
                {ty.key}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
          <span>{t('types.fieldCount', { count: ty.fields.length })}</span>
          {sensitiveCount > 0 && (
            <span className="text-warning">· {sensitiveCount} sensitive</span>
          )}
          {ty.bound_asset_type_id && (
            <Badge variant="outline" className="gap-1 text-xs">
              <Link2 className="size-3" />
              {typeName(ty.bound_asset_type_id)}
            </Badge>
          )}
        </div>
        {canManage && (
          <div className="flex justify-end gap-1">
            {sensitiveCount > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                title={t('types.grants')}
                onClick={onGrants}
              >
                <ShieldCheck className="size-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="size-8" onClick={onEdit}>
              <Pencil className="size-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function EntityTypesPanel({ projectId }: { projectId: string }) {
  const { t } = useTranslation('registry')
  const role = useProjectRole(projectId)
  const canManage = roleAtLeast(role, 'manager')
  const query = useEntityTypes(projectId)
  const seed = useSeedDrugRd(projectId)
  const toastError = useToastError()

  const [createKind, setCreateKind] = useState<TypeKind | null>(null)
  const [editTarget, setEditTarget] = useState<EntityType | null>(null)
  const [grantsTarget, setGrantsTarget] = useState<EntityType | null>(null)

  const all = query.data ?? []
  const assets = all.filter((ty) => ty.kind === 'asset')
  const templates = all.filter((ty) => ty.kind === 'template')
  const nameOf = (id: string) => all.find((ty) => ty.id === id)?.name ?? id

  const onSeed = async () => {
    try {
      const types = await seed.mutateAsync()
      toast.success(t('types.seeded', { count: types.length }))
    } catch (e) {
      toastError(e)
    }
  }

  const renderSection = (title: string, kind: TypeKind, items: EntityType[]) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{title}</h3>
        {canManage && (
          <Button variant="outline" size="sm" onClick={() => setCreateKind(kind)}>
            <Plus className="size-4" />
            {t(kind === 'asset' ? 'types.createAsset' : 'types.createTemplate')}
          </Button>
        )}
      </div>
      {items.length === 0 ? (
        <p className="text-muted-foreground rounded-md border border-dashed px-3 py-6 text-center text-sm">
          {t('types.emptyKind')}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((ty) => (
            <TypeCard
              key={ty.id}
              ty={ty}
              typeName={nameOf}
              canManage={canManage}
              onEdit={() => setEditTarget(ty)}
              onGrants={() => setGrantsTarget(ty)}
            />
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">{t('types.title')}</h2>
        {canManage && (
          <Button
            variant="outline"
            title={t('types.seedHint')}
            onClick={onSeed}
            disabled={seed.isPending}
          >
            <Sparkles className="size-4" />
            {t('types.seed')}
          </Button>
        )}
      </div>

      {query.isLoading ? (
        <TableSkeleton rows={3} cols={2} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : all.length === 0 && !canManage ? (
        <EmptyState title={t('types.empty')} />
      ) : (
        <>
          {renderSection(t('types.assetTypes'), 'asset', assets)}
          {renderSection(t('types.dataTemplates'), 'template', templates)}
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
    </div>
  )
}
