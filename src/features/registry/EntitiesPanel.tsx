import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ColumnDef } from '@tanstack/react-table'
import { Check, GitBranch, Lock, MoreHorizontal, Pencil, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'

import { DataTable } from '@/components/data-table'
import { EmptyState } from '@/components/states'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useProjectRole } from '@/hooks/use-projects'
import { useDeleteEntity, useEntities, useEntityTypes } from '@/hooks/use-registry'
import { useToastError } from '@/hooks/use-toast-error'
import { roleAtLeast } from '@/lib/roles'
import { shortId } from '@/lib/format'
import { isHiddenSensitive } from '@/lib/field-types'
import type { Entity, EntityType, FieldDef } from '@/api/registry'
import { EntityDialog } from './EntityDialog'
import { EntityRelationsDialog } from './EntityRelationsDialog'

function Cell({ field, data }: { field: FieldDef; data: Record<string, unknown> }) {
  const { t } = useTranslation('registry')
  if (isHiddenSensitive(field, data)) {
    return (
      <Badge variant="outline" className="text-muted-foreground gap-1">
        <Lock className="size-3" />
        {t('entities.hidden')}
      </Badge>
    )
  }
  const val = data[field.name]
  if (val === undefined || val === null || val === '')
    return <span className="text-muted-foreground">-</span>
  if (typeof val === 'boolean')
    return val ? (
      <Check className="text-success size-4" />
    ) : (
      <X className="text-muted-foreground size-4" />
    )
  if (field.type === 'reference')
    return <span className="font-mono text-xs">{shortId(String(val))}</span>
  const s = String(val)
  return (
    <span className="block max-w-[24ch] truncate" title={s}>
      {s}
    </span>
  )
}

export function EntitiesPanel({ projectId }: { projectId: string }) {
  const { t } = useTranslation('registry')
  const role = useProjectRole(projectId)
  const canEdit = roleAtLeast(role, 'contributor')
  const types = useEntityTypes(projectId)
  const toastError = useToastError()

  const [typeId, setTypeId] = useState('')
  const [page, setPage] = useState({ limit: 20, offset: 0 })
  useEffect(() => {
    if (!typeId && types.data && types.data.length > 0) setTypeId(types.data[0].id)
  }, [types.data, typeId])

  const selectedType: EntityType | undefined = types.data?.find(
    (ty) => ty.id === typeId,
  )
  const entities = useEntities(projectId, { type: typeId, ...page }, !!typeId)

  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Entity | null>(null)
  const [relTarget, setRelTarget] = useState<Entity | null>(null)
  const [delTarget, setDelTarget] = useState<Entity | null>(null)
  const del = useDeleteEntity(projectId)

  const columns = useMemo<ColumnDef<Entity, unknown>[]>(() => {
    if (!selectedType) return []
    const fieldCols: ColumnDef<Entity, unknown>[] = selectedType.fields.map(
      (f) => ({
        id: f.name,
        header: f.name,
        cell: ({ row }) => <Cell field={f} data={row.original.data} />,
      }),
    )
    return [
      {
        id: 'id',
        header: 'ID',
        cell: ({ row }) => (
          <span className="font-mono text-xs">{shortId(row.original.id)}</span>
        ),
      },
      ...fieldCols,
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const e = row.original
          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setRelTarget(e)}>
                    <GitBranch className="size-4" />
                    {t('entities.relations')}
                  </DropdownMenuItem>
                  {canEdit && (
                    <>
                      <DropdownMenuItem onClick={() => setEditTarget(e)}>
                        <Pencil className="size-4" />
                        {t('entities.edit')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDelTarget(e)}
                      >
                        <Trash2 className="size-4" />
                        {t('actions.delete', { ns: 'common' })}
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ]
  }, [selectedType, canEdit, t])

  const onDelete = async () => {
    if (!delTarget) return
    try {
      await del.mutateAsync({ id: delTarget.id, version: delTarget.version })
      toast.success(t('entities.deleted'))
      setDelTarget(null)
    } catch (e) {
      toastError(e)
    }
  }

  if (types.data && types.data.length === 0) {
    return <EmptyState title={t('entities.selectTypeFirst')} />
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5">
          <Label>{t('entities.selectType')}</Label>
          <Select
            value={typeId}
            onValueChange={(v) => {
              setTypeId(v)
              setPage({ limit: 20, offset: 0 })
            }}
          >
            <SelectTrigger className="w-56">
              <SelectValue placeholder={t('entities.selectType')} />
            </SelectTrigger>
            <SelectContent>
              {(types.data ?? []).map((ty) => (
                <SelectItem key={ty.id} value={ty.id}>
                  {ty.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {canEdit && selectedType && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            {t('entities.create')}
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={entities.data?.items ?? []}
        loading={entities.isLoading || (!!typeId && !selectedType)}
        error={entities.isError ? entities.error : undefined}
        onRetry={() => entities.refetch()}
        empty={<EmptyState title={t('entities.empty')} />}
        pagination={{
          limit: page.limit,
          offset: page.offset,
          total: entities.data?.total ?? 0,
          onChange: setPage,
        }}
      />

      {selectedType && (
        <>
          <EntityDialog
            projectId={projectId}
            type={selectedType}
            open={createOpen}
            onOpenChange={setCreateOpen}
          />
          <EntityDialog
            projectId={projectId}
            type={selectedType}
            entity={editTarget}
            open={!!editTarget}
            onOpenChange={(o) => !o && setEditTarget(null)}
          />
        </>
      )}
      {relTarget && (
        <EntityRelationsDialog
          projectId={projectId}
          entity={relTarget}
          open={!!relTarget}
          onOpenChange={(o) => !o && setRelTarget(null)}
        />
      )}
      <ConfirmDialog
        open={!!delTarget}
        onOpenChange={(o) => !o && setDelTarget(null)}
        title={t('entities.deleteTitle')}
        description={t('entities.deleteDesc')}
        destructive
        loading={del.isPending}
        onConfirm={onDelete}
      />
    </div>
  )
}
