import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useCreateRecord, useUpdateRecord } from '@/hooks/use-registry'
import { useToastError } from '@/hooks/use-toast-error'
import type { Entity, EntityType, TypeKind } from '@/api/registry'
import { SchemaForm } from './SchemaForm'

/** 新建 / 编辑记录（药物资产或药物数据）。 */
export function EntityDialog({
  projectId,
  kind,
  type,
  open,
  onOpenChange,
  record,
  onCreated,
}: {
  projectId: string
  kind: TypeKind
  type: EntityType
  open: boolean
  onOpenChange: (open: boolean) => void
  record?: Entity | null
  /** 新建成功回调（返回新记录）：用于内嵌创建后自动选中。 */
  onCreated?: (entity: Entity) => void
}) {
  const { t } = useTranslation('registry')
  const create = useCreateRecord(projectId, kind)
  const update = useUpdateRecord(projectId, kind, record?.id ?? '')
  const toastError = useToastError()
  const [values, setValues] = useState<Record<string, unknown>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      setValues(record?.data ?? {})
      setErrors({})
    }
  }, [open, record])

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
        const created = await create.mutateAsync({ type_id: type.id, data: values })
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
        <div className="max-h-[60vh] overflow-auto py-1">
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
