import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
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
  useCreateType,
  useUpdateType,
  useEntityTypes,
} from '@/hooks/use-registry'
import { useToastError } from '@/hooks/use-toast-error'
import { autoSlug } from '@/lib/slug'
import {
  SCALAR_FIELD_TYPES,
  type EntityType,
  type FieldDefInput,
  type TypeKind,
} from '@/api/registry'
import { FieldBuilder } from './FieldBuilder'

const NONE = '__none'

export function EntityTypeDialog({
  projectId,
  kind: kindProp = 'asset',
  open,
  onOpenChange,
  type,
}: {
  projectId: string
  /** 创建时的类型种类；编辑时以 type.kind 为准。 */
  kind?: TypeKind
  open: boolean
  onOpenChange: (o: boolean) => void
  type?: EntityType | null
}) {
  const { t } = useTranslation('registry')
  const isEdit = !!type
  const kind: TypeKind = type?.kind ?? kindProp
  const create = useCreateType(projectId, kind)
  const update = useUpdateType(projectId, kind, type?.id ?? '')
  const toastError = useToastError()

  // 数据模版可绑定/拷贝某资产类型。
  const allTypes = useEntityTypes(projectId)
  const assetTypes = (allTypes.data ?? []).filter((ty) => ty.kind === 'asset')

  const [key, setKey] = useState('')
  const [name, setName] = useState('')
  const [fields, setFields] = useState<FieldDefInput[]>([])
  const [boundAsset, setBoundAsset] = useState(NONE)
  const [fromAsset, setFromAsset] = useState(NONE)
  const [errors, setErrors] = useState<{ name?: string }>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setKey(type?.key ?? '')
      setName(type?.name ?? '')
      setFields(type?.fields ?? [])
      setBoundAsset(type?.bound_asset_type_id ?? NONE)
      setFromAsset(NONE)
      setErrors({})
    }
  }, [open, type])

  const submit = async () => {
    if (!name.trim()) {
      setErrors({ name: t('types.nameRequired') })
      return
    }
    setSubmitting(true)
    try {
      if (isEdit && type) {
        await update.mutateAsync({ name, fields, version: type.version })
        toast.success(t('types.updated'))
      } else {
        await create.mutateAsync({
          key: key.trim() || autoSlug(name, kind === 'asset' ? 'asset' : 'tpl'),
          name,
          fields,
          ...(kind === 'template' && boundAsset !== NONE
            ? { bound_asset_type_id: boundAsset }
            : {}),
          ...(kind === 'template' && fromAsset !== NONE
            ? { from_asset_type_id: fromAsset }
            : {}),
        })
        toast.success(t('types.created'))
      }
      onOpenChange(false)
    } catch (e) {
      toastError(e)
    } finally {
      setSubmitting(false)
    }
  }

  const titleKey = isEdit
    ? 'types.edit'
    : kind === 'asset'
      ? 'types.createAsset'
      : 'types.createTemplate'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t(titleKey)}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!isEdit && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="tname">{t('types.name')}</Label>
                <Input
                  id="tname"
                  autoFocus
                  placeholder={t('types.namePlaceholder')}
                  value={name}
                  aria-invalid={!!errors.name}
                  onChange={(e) => setName(e.target.value)}
                />
                {errors.name && (
                  <p className="text-destructive text-sm">{errors.name}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="tkey">{t('types.key')}</Label>
                <Input
                  id="tkey"
                  placeholder={t('types.keyAuto')}
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                />
              </div>
            </div>
          )}
          {isEdit && (
            <div className="space-y-2">
              <Label htmlFor="tname">{t('types.name')}</Label>
              <Input
                id="tname"
                autoFocus
                value={name}
                aria-invalid={!!errors.name}
                onChange={(e) => setName(e.target.value)}
              />
              {errors.name && (
                <p className="text-destructive text-sm">{errors.name}</p>
              )}
            </div>
          )}

          {/* 数据模版专属：绑定/拷贝资产类型 */}
          {kind === 'template' && !isEdit && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t('types.boundAsset')}</Label>
                <Select value={boundAsset} onValueChange={setBoundAsset}>
                  <SelectTrigger>
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
                <p className="text-muted-foreground text-xs">
                  {t('types.boundHint')}
                </p>
              </div>
              <div className="space-y-2">
                <Label>{t('types.fromAsset')}</Label>
                <Select value={fromAsset} onValueChange={setFromAsset}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>{t('types.fromNone')}</SelectItem>
                    {assetTypes.map((ty) => (
                      <SelectItem key={ty.id} value={ty.id}>
                        {ty.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-xs">
                  {t('types.fromHint')}
                </p>
              </div>
            </div>
          )}

          <FieldBuilder
            value={fields}
            onChange={setFields}
            allowedTypes={kind === 'template' ? SCALAR_FIELD_TYPES : undefined}
          />
        </div>

        <DialogFooter>
          <Button onClick={submit} disabled={submitting}>
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {isEdit ? t('actions.save', { ns: 'common' }) : t(titleKey)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
