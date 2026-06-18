import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { RowList, Row } from '@/components/row-list'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EmptyState, TableSkeleton } from '@/components/states'
import {
  useAddRelation,
  useComponentTree,
  useDeleteRelation,
  useEntityTypes,
  useLineage,
  useRelations,
} from '@/hooks/use-registry'
import { useToastError } from '@/hooks/use-toast-error'
import { shortId } from '@/lib/format'
import { RELATION_KINDS, type Entity } from '@/api/registry'
import { EntityPicker } from './EntityPicker'
import { ComponentTreeView } from './ComponentTreeView'

const KINDS = [RELATION_KINDS.hasComponent, RELATION_KINDS.derivedFrom]

export function EntityRelationsDialog({
  projectId,
  entity,
  open,
  onOpenChange,
}: {
  projectId: string
  entity: Entity
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const { t } = useTranslation('registry')
  const types = useEntityTypes(projectId)
  const typeMap = Object.fromEntries(
    (types.data ?? []).map((ty) => [ty.id, ty.name]),
  )
  const relations = useRelations(projectId, entity.id, { direction: 'out' })
  const tree = useComponentTree(projectId, entity.id, open)
  const lineage = useLineage(projectId, entity.id, open)
  const add = useAddRelation(projectId, entity.id)
  const del = useDeleteRelation(projectId)
  const toastError = useToastError()

  const [kind, setKind] = useState<string>(RELATION_KINDS.hasComponent)
  const [target, setTarget] = useState<string | undefined>()

  const onAdd = async () => {
    if (!target) return
    try {
      await add.mutateAsync({ to_entity: target, kind })
      toast.success(t('relations.added'))
      setTarget(undefined)
    } catch (e) {
      toastError(e)
    }
  }

  const onRemove = async (id: string) => {
    try {
      await del.mutateAsync(id)
      toast.success(t('relations.removed'))
    } catch (e) {
      toastError(e)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('entities.relations')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* add relation */}
          <div className="space-y-2">
            <Label>{t('relations.add')}</Label>
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KINDS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {t(`relations.${k}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <EntityPicker
              projectId={projectId}
              value={target}
              onChange={setTarget}
              excludeId={entity.id}
            />
            <Button onClick={onAdd} disabled={!target || add.isPending} size="sm">
              {add.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              {t('relations.add')}
            </Button>
          </div>

          {/* relations list */}
          <div className="space-y-2">
            <h3 className="text-[13px] font-bold">{t('relations.title')}</h3>
            {relations.isLoading ? (
              <TableSkeleton rows={2} cols={2} />
            ) : relations.data && relations.data.length > 0 ? (
              <RowList>
                {relations.data.map((r) => (
                  <Row key={r.id}>
                    <Badge variant="info">{t(`relations.${r.kind}`, r.kind)}</Badge>
                    <span className="text-brand flex-1 font-mono text-xs font-semibold">
                      {shortId(r.to_entity)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onRemove(r.id)}
                      aria-label={t('relations.removed')}
                    >
                      <Trash2 className="text-destructive size-4" />
                    </Button>
                  </Row>
                ))}
              </RowList>
            ) : (
              <p className="text-muted-foreground text-sm">
                {t('relations.empty')}
              </p>
            )}
          </div>

          {/* component tree */}
          <div className="space-y-2">
            <h3 className="text-[13px] font-bold">{t('tree.title')}</h3>
            <p className="text-muted-foreground text-xs">{t('tree.desc')}</p>
            {tree.isLoading ? (
              <TableSkeleton rows={2} cols={1} />
            ) : tree.data && tree.data.children.length > 0 ? (
              <div className="rounded-md border p-3">
                <ComponentTreeView node={tree.data} typeMap={typeMap} />
              </div>
            ) : (
              <EmptyState title={t('tree.empty')} />
            )}
          </div>

          {/* lineage (derived_from) */}
          <div className="space-y-2">
            <h3 className="text-[13px] font-bold">{t('lineage.title')}</h3>
            <p className="text-muted-foreground text-xs">{t('lineage.desc')}</p>
            {lineage.isLoading ? (
              <TableSkeleton rows={2} cols={1} />
            ) : lineage.data && lineage.data.length > 0 ? (
              <RowList>
                {lineage.data.map((n) => (
                  <Row key={n.id}>
                    <span className="text-brand font-mono text-xs font-semibold">
                      {shortId(n.id)}
                    </span>
                    <Badge variant="neutral">
                      {typeMap[n.type_id] ?? shortId(n.type_id)}
                    </Badge>
                  </Row>
                ))}
              </RowList>
            ) : (
              <p className="text-muted-foreground text-sm">{t('lineage.empty')}</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
