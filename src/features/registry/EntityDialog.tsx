import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Link2, Loader2, Search } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useCreateRecord,
  useEntityTypes,
  useRecords,
  useUpdateRecord,
} from '@/hooks/use-registry'
import { useToastError } from '@/hooks/use-toast-error'
import { shortId } from '@/lib/format'
import { fieldDisplayName } from '@/api/registry'
import type { Entity, EntityType, FieldDef, TypeKind } from '@/api/registry'
import { SchemaForm } from './SchemaForm'

const NONE = '__none__'

/** 新建 / 编辑记录（药物资产或药物数据）。 */
export function EntityDialog({
  projectId,
  kind,
  type,
  open,
  onOpenChange,
  record,
  onCreated,
  showAssetLinker = false,
}: {
  projectId: string
  kind: TypeKind
  type: EntityType
  open: boolean
  onOpenChange: (open: boolean) => void
  record?: Entity | null
  showAssetLinker?: boolean
  /** 新建成功回调（返回新记录）：用于内嵌创建后自动选中。 */
  onCreated?: (entity: Entity) => void
}) {
  const { t } = useTranslation('registry')
  const create = useCreateRecord(projectId, kind)
  const update = useUpdateRecord(projectId, kind, record?.id ?? '')
  const toastError = useToastError()
  const [values, setValues] = useState<Record<string, unknown>>({})
  const [assetRecordId, setAssetRecordId] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      setValues(record?.data ?? {})
      setAssetRecordId(record?.asset_record_id ?? null)
      setErrors({})
    }
  }, [open, record])

  const applyAssetRecord = (asset: Entity) => {
    setAssetRecordId(asset.id)
    setValues((prev) => {
      const next = { ...prev }
      type.fields.forEach((field) => {
        const current = next[field.name]
        const incoming = asset.data[field.name]
        if ((current == null || current === '') && incoming != null && incoming !== '') {
          next[field.name] = incoming
        }
      })
      return next
    })
  }

  const submit = async () => {
    const errs: Record<string, string> = {}
    type.fields.forEach((f) => {
      if (f.required) {
        const v = values[f.name]
        if (v == null || v === '') errs[f.name] = t('errors.required')
      }
    })
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }
    try {
      if (record) {
        await update.mutateAsync({ data: values, version: record.version })
        toast.success(t('entities.updated'))
      } else {
        const created = await create.mutateAsync({
          type_id: type.id,
          data: values,
          ...(kind === 'template' && assetRecordId
            ? { asset_record_id: assetRecordId }
            : {}),
        })
        onCreated?.(created)
        toast.success(t('entities.created'))
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
            {record ? t('entities.edit') : t('entities.create')} ·{' '}
            <span className="text-muted-foreground">{type.name}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-4 overflow-auto py-1">
          {showAssetLinker && kind === 'template' && (
            <AssetRecordLinker
              projectId={projectId}
              template={type}
              value={assetRecordId}
              disabled={!!record}
              onChange={setAssetRecordId}
              onAssetSelected={applyAssetRecord}
            />
          )}
          <SchemaForm
            projectId={projectId}
            fields={type.fields}
            values={values}
            errors={errors}
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

function AssetRecordLinker({
  projectId,
  template,
  value,
  disabled,
  onChange,
  onAssetSelected,
}: {
  projectId: string
  template: EntityType
  value: string | null
  disabled?: boolean
  onChange: (id: string | null) => void
  onAssetSelected: (asset: Entity) => void
}) {
  const { t, i18n } = useTranslation('registry')
  const types = useEntityTypes(projectId)
  const assetTypes = (types.data ?? []).filter((ty) => ty.kind === 'asset')
  const boundType = template.bound_asset_type_id
    ? assetTypes.find((ty) => ty.id === template.bound_asset_type_id)
    : undefined
  const [pickedTypeId, setPickedTypeId] = useState('')
  const targetType = boundType ?? assetTypes.find((ty) => ty.id === pickedTypeId)
  const [matchField, setMatchField] = useState('')
  const [matchValue, setMatchValue] = useState('')

  useEffect(() => {
    if (!targetType) {
      setMatchField('')
      return
    }
    if (!matchField || !targetType.fields.some((f) => f.name === matchField)) {
      const preferred =
        targetType.fields.find((f) => f.name === 'id') ??
        targetType.fields.find((f) => f.name === 'name') ??
        targetType.fields.find((f) => !['reference', 'structure'].includes(f.type))
      setMatchField(preferred?.name ?? '')
    }
  }, [matchField, targetType])

  const field = targetType?.fields.find((f) => f.name === matchField)
  const contains =
    field && matchValue.trim()
      ? JSON.stringify({ [field.name]: coerceMatchValue(matchValue.trim(), field) })
      : undefined
  const records = useRecords(
    projectId,
    'asset',
    { type: targetType?.id ?? '', contains, limit: 50 },
    !!targetType,
  )
  const items = records.data?.items ?? []
  const label = (entity: Entity) =>
    String(entity.data.name ?? entity.data.id ?? shortId(entity.id))

  const selectRecord = (id: string) => {
    if (id === NONE) {
      onChange(null)
      return
    }
    const asset = items.find((item) => item.id === id)
    if (asset) {
      onAssetSelected(asset)
    } else {
      onChange(id)
    }
  }

  return (
    <div className="rounded-[8px] border bg-surface-1 px-3 py-3">
      <div className="mb-3 flex items-start gap-2">
        <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-accent text-brand">
          <Link2 className="size-4" />
        </div>
        <div className="min-w-0">
          <div className="text-[13px] font-bold">{t('entities.assetRecord')}</div>
          <div className="mt-0.5 text-[12px] text-muted-foreground">
            {t('entities.assetRecordMatchHint')}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-1.5">
          <Label className="text-[12px] text-[#5a6473]">
            {t('entities.assetType')}
          </Label>
          {boundType ? (
            <div className="flex h-9 items-center rounded-md border bg-muted px-3 text-sm text-muted-foreground">
              {boundType.name}
            </div>
          ) : (
            <Select
              value={pickedTypeId}
              onValueChange={setPickedTypeId}
              disabled={disabled}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('picker.selectType')} />
              </SelectTrigger>
              <SelectContent>
                {assetTypes.map((ty) => (
                  <SelectItem key={ty.id} value={ty.id}>
                    {ty.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-[12px] text-[#5a6473]">
            {t('entities.matchField')}
          </Label>
          <Select
            value={matchField}
            onValueChange={setMatchField}
            disabled={!targetType || disabled}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('entities.matchField')} />
            </SelectTrigger>
            <SelectContent>
              {(targetType?.fields ?? [])
                .filter((f) => !['reference', 'structure'].includes(f.type))
                .map((f) => (
                  <SelectItem key={f.name} value={f.name}>
                    {fieldDisplayName(f, i18n.language)}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[12px] text-[#5a6473]">
            {t('entities.matchValue')}
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              value={matchValue}
              disabled={!targetType || !matchField || disabled}
              placeholder={t('entities.matchValuePlaceholder')}
              onChange={(e) => setMatchValue(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[12px] text-[#5a6473]">
            {t('entities.assetRecord')}
          </Label>
          <Select
            value={value ?? NONE}
            onValueChange={selectRecord}
            disabled={!targetType || disabled}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('picker.selectEntity')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>{t('picker.none')}</SelectItem>
              {items.map((entity) => (
                <SelectItem key={entity.id} value={entity.id}>
                  {label(entity)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {disabled && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          {t('entities.assetRecordEditHint')}
        </p>
      )}
    </div>
  )
}

function coerceMatchValue(value: string, field: FieldDef) {
  if (field.type === 'integer' || field.type === 'number') {
    const n = Number(value)
    return Number.isFinite(n) ? n : value
  }
  if (field.type === 'boolean') {
    if (/^(true|1|yes|是)$/i.test(value)) return true
    if (/^(false|0|no|否)$/i.test(value)) return false
  }
  return value
}
