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
import { useCreateEntity, useUpdateEntity } from '@/hooks/use-registry'
import { useToastError } from '@/hooks/use-toast-error'
import {
  buildData,
  initialValues,
  validateEntity,
  type FormValues,
} from '@/lib/field-types'
import type { Entity, EntityType } from '@/api/registry'
import { SchemaForm } from './SchemaForm'

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
  const create = useCreateEntity(projectId)
  const update = useUpdateEntity(projectId, entity?.id ?? '')
  const toastError = useToastError()

  const [values, setValues] = useState<FormValues>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setValues(initialValues(type.fields, entity?.data))
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
        await create.mutateAsync({ type_id: type.id, data })
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
          <Button onClick={submit} disabled={submitting}>
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {isEdit ? t('actions.save', { ns: 'common' }) : t('entities.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
