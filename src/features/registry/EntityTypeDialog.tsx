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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateType, useEntityTypes, useUpdateType } from '@/hooks/use-registry'
import { useToastError } from '@/hooks/use-toast-error'
import { slugify } from '@/lib/slug'
import { SCALAR_FIELD_TYPES } from '@/api/registry'
import type { EntityType, FieldDefInput, TypeKind } from '@/api/registry'
import { InfoHint } from '@/components/info-hint'
import { FieldBuilder } from './FieldBuilder'

const NONE = '__none__'

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
  const { t } = useTranslation('registry')
  const editing = !!type
  const create = useCreateType(projectId, kind)
  const update = useUpdateType(projectId, kind, type?.id ?? '')
  const types = useEntityTypes(projectId)
  const assetTypes = (types.data ?? []).filter((ty) => ty.kind === 'asset')
  const toastError = useToastError()

  const [key, setKey] = useState('')
  const [name, setName] = useState('')
  const [fields, setFields] = useState<FieldDefInput[]>([])
  const [bound, setBound] = useState(NONE)

  useEffect(() => {
    if (open) {
      setKey(type?.key ?? '')
      setName(type?.name ?? '')
      setFields(
        (type?.fields ?? []).map((f) => ({
          name: f.name,
          type: f.type,
          required: f.required,
          unique: f.unique,
          sensitive: f.sensitive,
          options: f.options ?? [],
          ref_type: f.ref_type ?? undefined,
        })),
      )
      setBound(type?.bound_asset_type_id ?? NONE)
    }
  }, [open, type])

  const submit = async () => {
    if (!name.trim()) return
    try {
      if (editing) {
        await update.mutateAsync({ name: name.trim(), fields, version: type!.version })
        toast.success(t('types.updated'))
      } else {
        await create.mutateAsync({
          key: key.trim() || slugify(name),
          name: name.trim(),
          fields,
          bound_asset_type_id:
            kind === 'template' && bound !== NONE ? bound : undefined,
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

          {kind === 'template' && !editing && (
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
                      {ty.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <FieldBuilder
            value={fields}
            onChange={setFields}
            allowedTypes={allowed}
            assetTypes={assetTypes.map((ty) => ({ key: ty.key, name: ty.name }))}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('actions.cancel', { ns: 'common', defaultValue: '取消' })}
          </Button>
          <Button onClick={submit} disabled={!name.trim() || pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            {editing ? t('types.edit') : t('types.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
