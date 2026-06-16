import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { EmptyState, TableSkeleton } from '@/components/states'
import { useAddLink, useDatasetLinks, useDeleteLink } from '@/hooks/use-datasets'
import { useProjects } from '@/hooks/use-projects'
import { useToastError } from '@/hooks/use-toast-error'
import { shortId } from '@/lib/format'
import { RELATION_KINDS } from '@/api/registry'
import type { DatasetLink } from '@/api/datasets'
import { EntityPicker } from '@/features/registry/EntityPicker'

export function DatasetLinksPanel({
  datasetId,
  canManage,
}: {
  datasetId: string
  canManage: boolean
}) {
  const { t } = useTranslation('datasets')
  const { t: tr } = useTranslation('registry')
  const links = useDatasetLinks(datasetId)
  const add = useAddLink(datasetId)
  const del = useDeleteLink(datasetId)
  const projects = useProjects({ limit: 100 })
  const toastError = useToastError()

  const [projectId, setProjectId] = useState('')
  const [entityId, setEntityId] = useState<string | undefined>()
  const [kind, setKind] = useState<string>(RELATION_KINDS.derivedFrom)
  const [removeTarget, setRemoveTarget] = useState<DatasetLink | null>(null)

  const onAdd = async () => {
    if (!entityId) return
    try {
      await add.mutateAsync({ entity_id: entityId, kind })
      toast.success(t('toast.linkAdded'))
      setEntityId(undefined)
    } catch (e) {
      toastError(e)
    }
  }

  const onRemove = async () => {
    if (!removeTarget) return
    try {
      await del.mutateAsync(removeTarget.id)
      toast.success(t('toast.linkRemoved'))
      setRemoveTarget(null)
    } catch (e) {
      toastError(e)
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="font-medium">{t('links.title')}</h2>

      {canManage && (
        <div className="space-y-2 rounded-lg border p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t('links.project')}</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('links.project')} />
                </SelectTrigger>
                <SelectContent>
                  {(projects.data?.items ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('links.kind')}</Label>
              <Select value={kind} onValueChange={setKind}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={RELATION_KINDS.derivedFrom}>
                    {tr('relations.derived_from')}
                  </SelectItem>
                  <SelectItem value={RELATION_KINDS.hasComponent}>
                    {tr('relations.has_component')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {projectId && (
            <div className="space-y-1.5">
              <Label>{t('links.entity')}</Label>
              <EntityPicker
                projectId={projectId}
                value={entityId}
                onChange={setEntityId}
              />
            </div>
          )}
          <Button size="sm" onClick={onAdd} disabled={!entityId || add.isPending}>
            {add.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            {t('links.add')}
          </Button>
        </div>
      )}

      {links.isLoading ? (
        <TableSkeleton rows={2} cols={2} />
      ) : links.data && links.data.length > 0 ? (
        <ul className="divide-y rounded-md border">
          {links.data.map((l) => (
            <li
              key={l.id}
              className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
            >
              <span className="flex items-center gap-2">
                <Badge variant="secondary">{tr(`relations.${l.kind}`, l.kind)}</Badge>
                <span className="font-mono text-xs">{shortId(l.entity_id)}</span>
              </span>
              {canManage && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => setRemoveTarget(l)}
                >
                  <Trash2 className="text-destructive size-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title={t('links.empty')} />
      )}

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(o) => !o && setRemoveTarget(null)}
        title={t('links.removeTitle')}
        destructive
        loading={del.isPending}
        onConfirm={onRemove}
      />
    </div>
  )
}
