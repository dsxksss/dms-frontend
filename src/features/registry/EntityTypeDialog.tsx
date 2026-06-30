import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateType, useEntityTypes, useUpdateType } from '@/hooks/use-registry'
import { useUnits } from '@/hooks/use-units'
import { useToastError } from '@/hooks/use-toast-error'
import { autoSlug } from '@/lib/slug'
import { SCALAR_FIELD_TYPES, entityTypeDisplayName } from '@/api/registry'
import type { EntityType, FieldDefInput, TypeKind } from '@/api/registry'
import { InfoHint } from '@/components/info-hint'
import { FieldBuilder } from './FieldBuilder'

const NONE = '__none__'

const cleanFields = (fields: FieldDefInput[]): FieldDefInput[] =>
  fields.map((f) => ({
    ...f,
    name: f.name.trim(),
    zh_label: f.zh_label?.trim() || undefined,
    en_label: f.en_label?.trim() || undefined,
  }))

/** Schema builder：定义资产类型 / 数据模版（key + 名称 + 字段）。 */
export function EntityTypeDialog({
  projectId,
  kind,
  open,
  onOpenChange,
  type,
}: {
  projectId: string
  kind: TypeKind
  open: boolean
  onOpenChange: (open: boolean) => void
  type?: EntityType | null
}) {
  const { t, i18n } = useTranslation('registry')
  const editing = !!type
  const create = useCreateType(projectId, kind)
  const update = useUpdateType(projectId, kind, type?.id ?? '')
  const types = useEntityTypes(projectId)
  const units = useUnits(projectId)
  const assetTypes = (types.data ?? []).filter((ty) => ty.kind === 'asset')
  const toastError = useToastError()

  const [key, setKey] = useState('')
  const [name, setName] = useState('')
  const [nameZh, setNameZh] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [description, setDescription] = useState('')
  const [fields, setFields] = useState<FieldDefInput[]>([])
  const [bound, setBound] = useState(NONE)
  const [fromAsset, setFromAsset] = useState(NONE)

  useEffect(() => {
    if (open) {
      setKey(type?.key ?? '')
      setName(type?.name ?? '')
      setNameZh(type?.name_zh ?? '')
      setNameEn(type?.name_en ?? '')
      setDescription(type?.description ?? '')
      setFields(
        (type?.fields ?? []).map((f) => ({
          name: f.name,
          zh_label: f.zh_label ?? undefined,
          en_label: f.en_label ?? undefined,
          type: f.type,
          required: f.required,
          unique: f.unique,
          sensitive: f.sensitive,
          options: f.options ?? [],
          ref_type: f.ref_type ?? undefined,
          unit_id: f.unit_id ?? undefined,
          unit_symbol: f.unit_symbol ?? undefined,
        })),
      )
      setBound(type?.bound_asset_type_id ?? NONE)
      setFromAsset(NONE)
    }
  }, [open, type])

  const onFromAssetChange = (value: string) => {
    setFromAsset(value)
    if (kind === 'template' && value !== NONE && bound === NONE) {
      setBound(value)
    }
  }

  const submit = async () => {
    const displayName = name.trim() || nameZh.trim() || nameEn.trim()
    if (!displayName) return
    try {
      if (editing) {
        await update.mutateAsync({
          name: name.trim() || displayName,
          name_zh: nameZh.trim() || null,
          name_en: nameEn.trim() || null,
          description: description.trim() || null,
          fields: cleanFields(fields),
          version: type!.version,
        })
        toast.success(t('types.updated'))
      } else {
        await create.mutateAsync({
          key: key.trim() || autoSlug(nameEn.trim() || displayName, 'type'),
          name: displayName,
          name_zh: nameZh.trim() || undefined,
          name_en: nameEn.trim() || undefined,
          description: description.trim() || undefined,
          fields: cleanFields(fields),
          bound_asset_type_id:
            kind === 'template' && bound !== NONE ? bound : undefined,
          from_asset_type_id:
            kind === 'template' && fromAsset !== NONE ? fromAsset : undefined,
        })
        toast.success(t('types.created'))
      }
      onOpenChange(false)
    } catch (e) {
      toastError(e)
    }
  }

  const pending = create.isPending || update.isPending
  const allowed = kind === 'template' ? SCALAR_FIELD_TYPES : undefined

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle>
            {kind === 'asset'
              ? t('types.createAsset')
              : t('types.createTemplate')}{' '}
            <span className="text-[14px] font-semibold text-muted-foreground">
              Schema builder
            </span>
          </DialogTitle>
          <DialogDescription>{t('subtitle')}</DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-5 overflow-auto py-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-[12px] text-[#5a6473]">
                {t('types.key')}
                <InfoHint>{t('types.keyHint')}</InfoHint>
              </Label>
              <Input
                placeholder={t('types.keyPlaceholder')}
                value={key}
                disabled={editing}
                onChange={(e) => setKey(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] text-[#5a6473]">{t('types.name')}</Label>
              <Input
                placeholder={t('types.namePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-[12px] text-[#5a6473]">
                {t('types.nameZh')}
              </Label>
              <Input
                placeholder={t('types.nameZhPlaceholder')}
                value={nameZh}
                onChange={(e) => setNameZh(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] text-[#5a6473]">
                {t('types.nameEn')}
              </Label>
              <Input
                placeholder={t('types.nameEnPlaceholder')}
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-[12px] text-[#5a6473]">
                {t('types.description')}
              </Label>
              <Textarea
                placeholder={t('types.descriptionPlaceholder')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-20 resize-none"
              />
            </div>
          </div>

          {kind === 'template' && !editing && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-[12px] text-[#5a6473]">
                  {t('types.fromAsset')}
                  <InfoHint>{t('types.fromAssetHint')}</InfoHint>
                </Label>
                <Select value={fromAsset} onValueChange={onFromAssetChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>{t('types.fromNone')}</SelectItem>
                    {assetTypes.map((ty) => (
                      <SelectItem key={ty.id} value={ty.id}>
                        {entityTypeDisplayName(ty, i18n.language)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-[12px] text-[#5a6473]">
                  {t('types.boundAsset')}
                  <InfoHint>{t('types.boundAssetHint')}</InfoHint>
                </Label>
                <Select value={bound} onValueChange={setBound}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>{t('types.boundNone')}</SelectItem>
                    {assetTypes.map((ty) => (
                      <SelectItem key={ty.id} value={ty.id}>
                        {entityTypeDisplayName(ty, i18n.language)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <FieldBuilder
            value={fields}
            onChange={setFields}
            allowedTypes={allowed}
            assetTypes={assetTypes.map((ty) => ({
              key: ty.key,
              name: entityTypeDisplayName(ty, i18n.language),
            }))}
            units={units.data ?? []}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('actions.cancel', { ns: 'common', defaultValue: '取消' })}
          </Button>
          <Button
            onClick={submit}
            disabled={!(name.trim() || nameZh.trim() || nameEn.trim()) || pending}
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            {editing ? t('types.edit') : t('types.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
