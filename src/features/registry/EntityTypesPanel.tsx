import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { KeyRound, Pencil, Plus, ShieldCheck, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { EmptyState, ErrorState, TableSkeleton } from '@/components/states'
import { useProjectRole } from '@/hooks/use-projects'
import { useEntityTypes, useSeedDrugRd } from '@/hooks/use-registry'
import { useToastError } from '@/hooks/use-toast-error'
import { roleAtLeast } from '@/lib/roles'
import type { EntityType } from '@/api/registry'
import { EntityTypeDialog } from './EntityTypeDialog'
import { FieldGrantsDialog } from './FieldGrantsDialog'

export function EntityTypesPanel({ projectId }: { projectId: string }) {
  const { t } = useTranslation('registry')
  const role = useProjectRole(projectId)
  const canManage = roleAtLeast(role, 'manager')
  const query = useEntityTypes(projectId)
  const seed = useSeedDrugRd(projectId)
  const toastError = useToastError()

  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<EntityType | null>(null)
  const [grantsTarget, setGrantsTarget] = useState<EntityType | null>(null)

  const onSeed = async () => {
    try {
      const types = await seed.mutateAsync()
      toast.success(t('types.seeded', { count: types.length }))
    } catch (e) {
      toastError(e)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">{t('types.title')}</h2>
        {canManage && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              title={t('types.seedHint')}
              onClick={onSeed}
              disabled={seed.isPending}
            >
              <Sparkles className="size-4" />
              {t('types.seed')}
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              {t('types.create')}
            </Button>
          </div>
        )}
      </div>

      {query.isLoading ? (
        <TableSkeleton rows={3} cols={2} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data && query.data.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {query.data.map((ty) => {
            const sensitiveCount = ty.fields.filter((f) => f.sensitive).length
            return (
              <Card key={ty.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{ty.name}</div>
                      <div className="text-muted-foreground flex items-center gap-1 font-mono text-xs">
                        <KeyRound className="size-3" />
                        {ty.key}
                      </div>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {t(`scope.${ty.scope}`)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">
                    {t('types.fieldCount', { count: ty.fields.length })}
                    {sensitiveCount > 0 && (
                      <span className="text-warning ml-2">
                        · {sensitiveCount} sensitive
                      </span>
                    )}
                  </span>
                  {canManage && (
                    <div className="flex gap-1">
                      {sensitiveCount > 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          title={t('types.grants')}
                          onClick={() => setGrantsTarget(ty)}
                        >
                          <ShieldCheck className="size-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => setEditTarget(ty)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <EmptyState
          title={t('types.empty')}
          description={t('types.emptyDesc')}
          action={
            canManage ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  title={t('types.seedHint')}
                  onClick={onSeed}
                  disabled={seed.isPending}
                >
                  <Sparkles className="size-4" />
                  {t('types.seed')}
                </Button>
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="size-4" />
                  {t('types.create')}
                </Button>
              </div>
            ) : undefined
          }
        />
      )}

      <EntityTypeDialog
        projectId={projectId}
        open={createOpen}
        onOpenChange={setCreateOpen}
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
