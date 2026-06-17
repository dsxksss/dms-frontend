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
import { Label } from '@/components/ui/label'
import { useCreateRecord, useUpdateRecord } from '@/hooks/use-registry'
import { useToastError } from '@/hooks/use-toast-error'
import {
  buildData,
  initialValues,
  validateEntity,
  type FormValues,
} from '@/lib/field-types'
import type { Entity, EntityType } from '@/api/registry'
import { SchemaForm } from './SchemaForm'
import { EntityPicker } from './EntityPicker'

export function EntityDialog({
  projectId,
  type,
  entity,
  open,
  onOpenChange,
}: {
  projectId: string
  type: EntityType
  entity?: Entity | null
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const { t } = useTranslation('registry')
  const isEdit = !!entity
  const create = useCreateRecord(projectId, type.kind)
  const update = useUpdateRecord(projectId, type.kind, entity?.id ?? '')
  const toastError = useToastError()

  const [values, setValues] = useState<FormValues>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [assetRecordId, setAssetRecordId] = useState<string | undefined>()
  const [submitting, setSubmitting] = useState(false)

  // 数据模版（template）的记录可关联一条药物资产记录。
  const isData = type.kind === 'template'

  useEffect(() => {
    if (open) {
      setValues(initialValues(type.fields, entity?.data))
      setAssetRecordId(entity?.asset_record_id ?? undefined)
      setErrors({})
    }
  }, [open, type, entity])

  const submit = async () => {
    const errs = validateEntity(type.fields, values)
    setErrors(errs)
    if (Object.keys(errs).length) return

    const data = buildData(type.fields, values)
    setSubmitting(true)
    try {
      if (isEdit && entity) {
        await update.mutateAsync({ data, version: entity.version })
        toast.success(t('entities.updated'))
      } else {
        await create.mutateAsync({
          type_id: type.id,
          data,
          ...(isData && assetRecordId ? { asset_record_id: assetRecordId } : {}),
        })
        toast.success(t('entities.created'))
      }
      onOpenChange(false)
    } catch (e) {
      toastError(e)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t('entities.edit') : t('entities.create')} · {type.name}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
          className="space-y-4"
        >
          {isData && !isEdit && (
            <div className="space-y-2">
              <Label>{t('entities.assetRecord')}</Label>
              <EntityPicker
                projectId={projectId}
                value={assetRecordId}
                onChange={setAssetRecordId}
              />
              <p className="text-muted-foreground text-xs">
                {t('entities.assetRecordHint')}
              </p>
            </div>
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

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? t('actions.save', { ns: 'common' }) : t('entities.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
