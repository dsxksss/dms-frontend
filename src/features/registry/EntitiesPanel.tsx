import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ColumnDef } from '@tanstack/react-table'
import { Check, GitBranch, Lock, MoreHorizontal, Pencil, Plus, Trash2, Upload, X } from 'lucide-react'
import { toast } from 'sonner'

import { DataTable } from '@/components/data-table'
import { EmptyState } from '@/components/states'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useProjectRole } from '@/hooks/use-projects'
import { useDeleteRecord, useRecords, useEntityTypes } from '@/hooks/use-registry'
import { useToastError } from '@/hooks/use-toast-error'
import { roleAtLeast } from '@/lib/roles'
import { shortId } from '@/lib/format'
import { cn } from '@/lib/utils'
import { isHiddenSensitive } from '@/lib/field-types'
import type { Entity, EntityType, FieldDef, TypeKind } from '@/api/registry'
import { EntityDialog } from './EntityDialog'
import { EntityRelationsDialog } from './EntityRelationsDialog'
import { ImportEntitiesDialog } from './ImportEntitiesDialog'

function Cell({ field, data }: { field: FieldDef; data: Record<string, unknown> }) {
  const { t } = useTranslation('registry')
  if (isHiddenSensitive(field, data)) {
    return (
      <Badge variant="lock" className="rounded-[7px]">
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

/** 记录列表：药物资产(kind=asset) 或 药物数据(kind=template)。 */
export function RecordsPanel({
  projectId,
  kind,
}: {
  projectId: string
  kind: TypeKind
}) {
  const { t } = useTranslation('registry')
  const role = useProjectRole(projectId)
  const canEdit = roleAtLeast(role, 'contributor')
  const allTypes = useEntityTypes(projectId)
  const types = (allTypes.data ?? []).filter((ty) => ty.kind === kind)
  const toastError = useToastError()

  const [typeId, setTypeId] = useState('')
  const [page, setPage] = useState({ limit: 20, offset: 0 })
  useEffect(() => {
    if (!typeId && types.length > 0) setTypeId(types[0].id)
  }, [types, typeId])

  const selectedType: EntityType | undefined = types.find((ty) => ty.id === typeId)
  const records = useRecords(projectId, kind, { type: typeId, ...page }, !!typeId)

  const [createOpen, setCreateOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Entity | null>(null)
  const [relTarget, setRelTarget] = useState<Entity | null>(null)
  const [delTarget, setDelTarget] = useState<Entity | null>(null)
  const del = useDeleteRecord(projectId, kind)

  const isAsset = kind === 'asset'

  // 不手动 useMemo：交由 React Compiler 自动记忆（cell 用到 setState，手动 deps 反而冲突）。
  const fieldCols: ColumnDef<Entity, unknown>[] = (selectedType?.fields ?? []).map(
    (f) => ({
      id: f.name,
      header: f.name,
      cell: ({ row }) => <Cell field={f} data={row.original.data} />,
    }),
  )
  const columns: ColumnDef<Entity, unknown>[] = !selectedType
    ? []
    : [
        {
          id: 'id',
          header: 'ID',
          cell: ({ row }) => (
            <span className="text-brand font-mono text-xs font-semibold">
              {shortId(row.original.id)}
            </span>
          ),
        },
        ...fieldCols,
        ...(isAsset
          ? []
          : [
              {
                id: 'asset_record',
                header: t('entities.assetRecord'),
                cell: ({ row }) => (
                  <span className="text-muted-foreground font-mono text-xs">
                    {row.original.asset_record_id
                      ? shortId(row.original.asset_record_id)
                      : '—'}
                  </span>
                ),
              } as ColumnDef<Entity, unknown>,
            ]),
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
                    {isAsset && (
                      <DropdownMenuItem onClick={() => setRelTarget(e)}>
                        <GitBranch className="size-4" />
                        {t('entities.relations')}
                      </DropdownMenuItem>
                    )}
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

  if (allTypes.data && types.length === 0) {
    return (
      <EmptyState
        title={t(isAsset ? 'entities.noAssetTypes' : 'entities.noTemplates')}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5 border-b">
        {types.map((ty) => (
          <button
            key={ty.id}
            onClick={() => {
              setTypeId(ty.id)
              setPage({ limit: 20, offset: 0 })
            }}
            className={cn(
              '-mb-px border-b-2 px-3 py-2.5 text-[13px] font-semibold whitespace-nowrap transition-colors',
              typeId === ty.id
                ? 'border-brand text-brand'
                : 'text-muted-foreground hover:text-foreground border-transparent',
            )}
          >
            {ty.name}
          </button>
        ))}
        {canEdit && selectedType && (
          <div className="ml-auto flex gap-2 pb-1.5">
            {isAsset && (
              <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                <Upload className="size-4" />
                {t('import.button')}
              </Button>
            )}
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              {t('entities.create')}
            </Button>
          </div>
        )}
      </div>

      <DataTable
        columns={columns}
        data={records.data?.items ?? []}
        loading={records.isLoading || (!!typeId && !selectedType)}
        error={records.isError ? records.error : undefined}
        onRetry={() => records.refetch()}
        empty={<EmptyState title={t('entities.empty')} />}
        pagination={{
          limit: page.limit,
          offset: page.offset,
          total: records.data?.total ?? 0,
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
          {isAsset && (
            <ImportEntitiesDialog
              projectId={projectId}
              type={selectedType}
              open={importOpen}
              onOpenChange={setImportOpen}
            />
          )}
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
