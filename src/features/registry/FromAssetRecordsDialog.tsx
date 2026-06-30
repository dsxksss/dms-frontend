import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Database, Loader2, Search } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { registryApi } from '@/api/registry'
import type { Entity, EntityType, FieldDef } from '@/api/registry'
import { useEntityTypes, useRecords } from '@/hooks/use-registry'
import { useToastError } from '@/hooks/use-toast-error'
import { shortId } from '@/lib/format'
import { SchemaForm } from './SchemaForm'

const MAX_BULK_ASSETS = 10_000

export function FromAssetRecordsDialog({
  projectId,
  type,
  open,
  onOpenChange,
}: {
  projectId: string
  type: EntityType
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation('registry')
  const qc = useQueryClient()
  const toastError = useToastError()
  const types = useEntityTypes(projectId)
  const assetTypes = (types.data ?? []).filter((ty) => ty.kind === 'asset')
  const boundType = type.bound_asset_type_id
    ? assetTypes.find((ty) => ty.id === type.bound_asset_type_id)
    : undefined
  const [pickedTypeId, setPickedTypeId] = useState('')
  const targetType = boundType ?? assetTypes.find((ty) => ty.id === pickedTypeId)
  const [matchField, setMatchField] = useState('')
  const [matchValue, setMatchValue] = useState('')
  const [values, setValues] = useState<Record<string, unknown>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (open) {
      setValues({})
      setErrors({})
      setMatchValue('')
    }
  }, [open])

  useEffect(() => {
    if (!targetType) {
      setMatchField('')
      return
    }
    if (!matchField || !targetType.fields.some((f) => f.name === matchField)) {
      const preferred =
        targetType.fields.find((f) => f.name === 'id') ??
        targetType.fields.find((f) => f.name === 'name') ??
        targetType.fields.find((f) => !isNonMatchableField(f))
      setMatchField(preferred?.name ?? '')
    }
  }, [matchField, targetType])

  const field = targetType?.fields.find((f) => f.name === matchField)
  const contains =
    field && matchValue.trim()
      ? JSON.stringify({ [field.name]: coerceMatchValue(matchValue.trim(), field) })
      : undefined
  const preview = useRecords(
    projectId,
    'asset',
    { type: targetType?.id ?? '', contains, limit: 100 },
    open && !!targetType,
  )
  const matchedTotal = preview.data?.total ?? 0
  const canSubmit = !!targetType && !pending && matchedTotal > 0

  const submit = async () => {
    if (!targetType) return
    setPending(true)
    setErrors({})
    try {
      const assets = await fetchAllMatchedAssets(projectId, targetType.id, contains)
      if (assets.length === 0) {
        toast.error(t('entities.bulkEmpty'))
        return
      }
      if (assets.length > MAX_BULK_ASSETS) {
        toast.error(t('entities.bulkTooMany', { count: MAX_BULK_ASSETS }))
        return
      }

      const payloads = assets.map((asset) => {
        const data = dataForAsset(type, values, asset)
        const missing = type.fields.find((f) => f.required && isBlank(data[f.name]))
        if (missing) {
          throw new MissingRequiredField(missing.name, labelAsset(asset))
        }
        return { asset, data }
      })

      for (const item of payloads) {
        await registryApi.createRecord(projectId, 'template', {
          type_id: type.id,
          data: item.data,
          asset_record_id: item.asset.id,
        })
      }
      await qc.invalidateQueries({ queryKey: ['registry', projectId] })
      toast.success(t('entities.bulkCreated', { count: payloads.length }))
      onOpenChange(false)
    } catch (e) {
      if (e instanceof MissingRequiredField) {
        setErrors({ [e.field]: t('errors.required') })
        toast.error(t('entities.bulkMissingRequired', { field: e.field, asset: e.asset }))
      } else {
        toastError(e)
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px]">
        <DialogHeader>
          <DialogTitle>
            {t('entities.createFromAsset')} ·{' '}
            <span className="text-muted-foreground">{type.name}</span>
          </DialogTitle>
          <DialogDescription>{t('entities.createFromAssetDesc')}</DialogDescription>
        </DialogHeader>

        <div className="max-h-[62vh] space-y-5 overflow-auto py-1">
          <div className="rounded-[8px] border bg-surface-1 px-3 py-3">
            <div className="mb-3 flex items-start gap-2">
              <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-accent text-brand">
                <Database className="size-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-bold">{t('entities.assetMatch')}</div>
                <div className="mt-0.5 text-[12px] text-muted-foreground">
                  {t('entities.assetMatchHint')}
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
                  <Select value={pickedTypeId} onValueChange={setPickedTypeId}>
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
                  disabled={!targetType}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('entities.matchField')} />
                  </SelectTrigger>
                  <SelectContent>
                    {(targetType?.fields ?? [])
                      .filter((f) => !isNonMatchableField(f))
                      .map((f) => (
                        <SelectItem key={f.name} value={f.name}>
                          {f.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-[12px] text-[#5a6473]">
                  {t('entities.matchValue')}
                </Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-8"
                    value={matchValue}
                    disabled={!targetType || !matchField}
                    placeholder={t('entities.matchAllPlaceholder')}
                    onChange={(e) => setMatchValue(e.target.value)}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {targetType
                    ? t('entities.matchedRecords', {
                        count: preview.isLoading ? '...' : matchedTotal,
                      })
                    : t('entities.pickAssetTypeFirst')}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <div className="text-[13px] font-bold">{t('entities.fixedValues')}</div>
              <div className="mt-0.5 text-[12px] text-muted-foreground">
                {t('entities.fixedValuesHint')}
              </div>
            </div>
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('actions.cancel', { ns: 'common', defaultValue: '取消' })}
          </Button>
          <Button onClick={submit} disabled={!canSubmit}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            {t('entities.bulkCreate', { count: matchedTotal })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

async function fetchAllMatchedAssets(
  projectId: string,
  typeId: string,
  contains?: string,
) {
  const out: Entity[] = []
  let offset = 0
  let total = 0
  do {
    const page = await registryApi.listRecords(projectId, 'asset', {
      type: typeId,
      contains,
      limit: 100,
      offset,
    })
    out.push(...page.items)
    total = page.total
    offset += page.limit
    if (out.length > MAX_BULK_ASSETS) break
  } while (out.length < total)
  return out
}

function dataForAsset(
  template: EntityType,
  fixedValues: Record<string, unknown>,
  asset: Entity,
) {
  const data: Record<string, unknown> = {}
  template.fields.forEach((field) => {
    const fixed = fixedValues[field.name]
    if (!isBlank(fixed)) {
      data[field.name] = fixed
      return
    }
    const incoming = asset.data[field.name]
    if (!isBlank(incoming)) data[field.name] = incoming
  })
  return data
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

function isNonMatchableField(field: FieldDef) {
  return field.type === 'reference' || field.type === 'structure'
}

function isBlank(value: unknown) {
  return value == null || value === ''
}

function labelAsset(entity: Entity) {
  return String(entity.data.name ?? entity.data.id ?? shortId(entity.id))
}

class MissingRequiredField extends Error {
  field: string
  asset: string

  constructor(field: string, asset: string) {
    super(`missing required field ${field}`)
    this.field = field
    this.asset = asset
  }
}
