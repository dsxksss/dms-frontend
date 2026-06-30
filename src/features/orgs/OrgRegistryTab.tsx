import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  FileUp,
  Loader2,
  Lock,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  Wand2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TableCard, GridFooter } from '@/components/data-grid'
import { EmptyState, ErrorState, TableSkeleton } from '@/components/states'
import { Pagination } from '@/components/pagination'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { cn } from '@/lib/utils'
import { shortId } from '@/lib/format'
import { slugify } from '@/lib/slug'
import { AppError } from '@/lib/errors'
import { useToastError } from '@/hooks/use-toast-error'
import {
  useOrgTypes,
  useOrgRecords,
  useCreateOrgType,
  useCreateOrgRecord,
  useUpdateOrgRecord,
  useDeleteOrgRecord,
  useImportOrgEntities,
} from '@/hooks/use-org-registry'
import { fieldDisplayName } from '@/api/registry'
import type { Entity, EntityType, FieldDefInput, TypeKind } from '@/api/registry'
import { FieldBuilder } from '@/features/registry/FieldBuilder'
import { SchemaForm } from '@/features/registry/SchemaForm'
import { MaskedValue } from '@/features/registry/MaskedValue'
import { ImportEntitiesDialog } from '@/features/registry/ImportEntitiesDialog'

const cleanFields = (fields: FieldDefInput[]): FieldDefInput[] =>
  fields.map((f) => ({
    ...f,
    name: f.name.trim(),
    zh_label: f.zh_label?.trim() || undefined,
    en_label: f.en_label?.trim() || undefined,
  }))

/**
 * 组织级药物资产 / 数据（场景 2.4）。读=组织成员；建类型/写记录=组织 admin。
 * 敏感字段：admin 全可见；member 整列脱敏（组织级暂无 field-grant）。
 */
export function OrgRegistryTab({
  orgId,
  kind,
  isAdmin,
}: {
  orgId: string
  kind: TypeKind
  isAdmin: boolean
}) {
  const { t } = useTranslation('orgs')
  const types = useOrgTypes(orgId)
  const kindTypes = (types.data ?? []).filter((ty) => ty.kind === kind)
  const [tab, setTab] = useState('')
  const [typeOpen, setTypeOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const activeType = kindTypes.find((ty) => ty.id === tab) ?? kindTypes[0]
  const importer = useImportOrgEntities(orgId, activeType?.id ?? '')

  if (types.isLoading) return <TableSkeleton rows={4} />
  if (types.isError) {
    // 403=非该组织成员（租户 owner 仅在列表「看得到」组织，未必是其成员）。
    if (types.error instanceof AppError && types.error.status === 403)
      return (
        <EmptyState
          title={t('registry.notMember')}
          hint={t('registry.notMemberHint')}
        />
      )
    return <ErrorState error={types.error} onRetry={() => types.refetch()} />
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {kindTypes.map((ty) => {
            const on = activeType?.id === ty.id
            return (
              <button
                key={ty.id}
                type="button"
                onClick={() => setTab(ty.id)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition',
                  on
                    ? 'border-brand bg-accent text-brand'
                    : 'border-transparent bg-[#F0F2F6] text-muted-foreground hover:text-foreground',
                )}
              >
                {ty.name}
              </button>
            )
          })}
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setTypeOpen(true)}>
              <Wand2 className="size-4" />
              {kind === 'asset'
                ? t('registry.createAssetType')
                : t('registry.createTemplate')}
            </Button>
            {activeType && kind === 'asset' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setImportOpen(true)}
              >
                <FileUp className="size-4" />
                {t('import.button', { ns: 'registry' })}
              </Button>
            )}
            {activeType && (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" />
                {t('registry.createRecord')}
              </Button>
            )}
          </div>
        )}
      </div>

      {kindTypes.length === 0 ? (
        <EmptyState
          title={t('registry.noTypes')}
          hint={isAdmin ? t('registry.noTypesAdmin') : t('registry.noTypesMember')}
        />
      ) : activeType ? (
        <OrgRecordsGrid
          orgId={orgId}
          kind={kind}
          type={activeType}
          isAdmin={isAdmin}
        />
      ) : null}

      {isAdmin && (
        <OrgTypeDialog
          orgId={orgId}
          kind={kind}
          open={typeOpen}
          onOpenChange={setTypeOpen}
        />
      )}
      {isAdmin && activeType && (
        <OrgEntityDialog
          orgId={orgId}
          kind={kind}
          type={activeType}
          open={createOpen}
          onOpenChange={setCreateOpen}
        />
      )}
      {isAdmin && activeType && kind === 'asset' && (
        <ImportEntitiesDialog
          importer={importer}
          open={importOpen}
          onOpenChange={setImportOpen}
        />
      )}
    </div>
  )
}

function OrgRecordsGrid({
  orgId,
  kind,
  type,
  isAdmin,
}: {
  orgId: string
  kind: TypeKind
  type: EntityType
  isAdmin: boolean
}) {
  const { t, i18n } = useTranslation('orgs')
  const [page, setPage] = useState({ limit: 20, offset: 0 })
  const query = useOrgRecords(orgId, kind, { type: type.id, ...page })
  const del = useDeleteOrgRecord(orgId, kind)
  const toastError = useToastError()
  const [editTarget, setEditTarget] = useState<Entity | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Entity | null>(null)

  const shown = type.fields.slice(0, 4)
  const cols = `108px ${shown.map(() => 'minmax(0,1fr)').join(' ')} 48px`
  const records = query.data?.items ?? []

  const onDelete = () => {
    if (!deleteTarget) return
    del
      .mutateAsync({ id: deleteTarget.id, version: deleteTarget.version })
      .then(() => {
        toast.success(t('registry.deleted'))
        setDeleteTarget(null)
      })
      .catch(toastError)
  }

  if (query.isLoading) return <TableSkeleton rows={5} />
  if (query.isError)
    return <ErrorState error={query.error} onRetry={() => query.refetch()} />
  if (records.length === 0)
    return (
      <EmptyState
        title={t('registry.emptyRecords')}
        hint={t('registry.emptyRecordsHint')}
      />
    )

  return (
    <>
      <TableCard>
        <div
          className="grid items-center border-b bg-surface-2 px-4 py-[11px]"
          style={{ gridTemplateColumns: cols }}
        >
          <div className="th">ID</div>
          {shown.map((f) => (
            <div key={f.name} className="th flex items-center gap-1 truncate">
              <span className="truncate">{fieldDisplayName(f, i18n.language)}</span>
              {f.sensitive && !isAdmin && (
                <Lock className="size-3 shrink-0 text-[#E0492C]" />
              )}
            </div>
          ))}
          <div />
        </div>

        {records.map((r) => (
          <div
            key={r.id}
            className="grid items-center border-b border-divider px-4 py-3 text-[13px] last:border-b-0"
            style={{ gridTemplateColumns: cols }}
          >
            <div className="mono truncate text-[12px] font-semibold text-brand">
              {shortId(r.id)}
            </div>
            {shown.map((f) => {
              const v = r.data[f.name]
              const masked = f.sensitive && !isAdmin
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
            <div>
              {isAdmin && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditTarget(r)}>
                      <Pencil className="size-4" />
                      {t('registry.edit')}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setDeleteTarget(r)}
                    >
                      <Trash2 className="size-4" />
                      {t('registry.delete')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        ))}

        <GridFooter>
          <span>{t('registry.total', { total: query.data?.total ?? 0 })}</span>
          <Pagination
            limit={page.limit}
            offset={page.offset}
            total={query.data?.total ?? 0}
            onChange={setPage}
          />
        </GridFooter>
      </TableCard>

      {editTarget && (
        <OrgEntityDialog
          orgId={orgId}
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
        title={t('entities.deleteTitle', { ns: 'registry' })}
        description={t('entities.deleteDesc', { ns: 'registry' })}
        destructive
        confirmText={t('actions.delete', { ns: 'common' })}
        loading={del.isPending}
        onConfirm={onDelete}
      />
    </>
  )
}

/** 组织级类型 Schema builder（精简：key + 名称 + 字段）。 */
function OrgTypeDialog({
  orgId,
  kind,
  open,
  onOpenChange,
}: {
  orgId: string
  kind: TypeKind
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation('orgs')
  const create = useCreateOrgType(orgId, kind)
  const types = useOrgTypes(orgId)
  const assetTypes = (types.data ?? []).filter((ty) => ty.kind === 'asset')
  const toastError = useToastError()
  const [key, setKey] = useState('')
  const [name, setName] = useState('')
  const [fields, setFields] = useState<FieldDefInput[]>([])

  useEffect(() => {
    if (open) {
      setKey('')
      setName('')
      setFields([])
    }
  }, [open])

  const submit = async () => {
    if (!name.trim()) return
    try {
      await create.mutateAsync({
        key: key.trim() || slugify(name),
        name: name.trim(),
        fields: cleanFields(fields),
      })
      toast.success(t('registry.typeCreated'))
      onOpenChange(false)
    } catch (e) {
      toastError(e)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle>
            {kind === 'asset'
              ? t('registry.createAssetType')
              : t('registry.createTemplate')}
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-4 overflow-auto py-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[12px] text-[#5a6473]">
                {t('registry.typeKey')}
              </Label>
              <Input value={key} onChange={(e) => setKey(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] text-[#5a6473]">
                {t('registry.typeName')}
              </Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          </div>
          <FieldBuilder
            value={fields}
            onChange={setFields}
            assetTypes={assetTypes.map((ty) => ({ key: ty.key, name: ty.name }))}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('actions.cancel', { ns: 'common', defaultValue: '取消' })}
          </Button>
          <Button onClick={submit} disabled={!name.trim() || create.isPending}>
            {create.isPending && <Loader2 className="size-4 animate-spin" />}
            {t('registry.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** 组织级记录新建 / 编辑。 */
function OrgEntityDialog({
  orgId,
  kind,
  type,
  open,
  onOpenChange,
  record,
}: {
  orgId: string
  kind: TypeKind
  type: EntityType
  open: boolean
  onOpenChange: (open: boolean) => void
  record?: Entity | null
}) {
  const { t } = useTranslation('orgs')
  const create = useCreateOrgRecord(orgId, kind)
  const update = useUpdateOrgRecord(orgId, kind, record?.id ?? '')
  const toastError = useToastError()
  const [values, setValues] = useState<Record<string, unknown>>({})

  useEffect(() => {
    if (open) setValues(record?.data ?? {})
  }, [open, record])

  const submit = async () => {
    try {
      if (record) {
        await update.mutateAsync({ data: values, version: record.version })
        toast.success(t('registry.recordUpdated'))
      } else {
        await create.mutateAsync({ type_id: type.id, data: values })
        toast.success(t('registry.recordCreated'))
      }
      onOpenChange(false)
    } catch (e) {
      toastError(e)
    }
  }

  const pending = create.isPending || update.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>
            {record ? t('registry.edit') : t('registry.createRecord')} ·{' '}
            <span className="text-muted-foreground">{type.name}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-auto py-1">
          {/* 组织级引用字段的候选选择器暂不跨 org 联动（场景 2.4 多为标量库）。 */}
          <SchemaForm
            projectId=""
            fields={type.fields}
            values={values}
            onChange={(name, value) =>
              setValues((prev) => ({ ...prev, [name]: value }))
            }
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('actions.cancel', { ns: 'common', defaultValue: '取消' })}
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            {t('actions.save', { ns: 'common', defaultValue: '保存' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
