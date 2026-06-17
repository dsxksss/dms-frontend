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
import { Textarea } from '@/components/ui/textarea'
import { useCreateDataset, useUpdateDataset } from '@/hooks/use-datasets'
import { useToastError } from '@/hooks/use-toast-error'
import type { Dataset } from '@/api/datasets'

export function CreateDatasetDialog({
  projectId,
  open,
  onOpenChange,
  dataset,
}: {
  projectId: string
  open: boolean
  onOpenChange: (o: boolean) => void
  dataset?: Dataset | null
}) {
  const { t } = useTranslation('datasets')
  const isEdit = !!dataset
  const create = useCreateDataset(projectId)
  const update = useUpdateDataset(projectId, dataset?.id ?? '')
  const toastError = useToastError()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [nameErr, setNameErr] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setName(dataset?.name ?? '')
      setDescription(dataset?.description ?? '')
      setNameErr(false)
    }
  }, [open, dataset])

  const submit = async () => {
    if (!name.trim()) {
      setNameErr(true)
      return
    }
    setSubmitting(true)
    try {
      if (isEdit && dataset) {
        await update.mutateAsync({ name, description, version: dataset.version })
        toast.success(t('toast.updated'))
      } else {
        await create.mutateAsync({ name, description })
        toast.success(t('toast.created'))
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? t('edit.title') : t('create.title')}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="dsname">{t('create.name')}</Label>
            <Input
              id="dsname"
              autoFocus
              placeholder={t('create.namePlaceholder')}
              value={name}
              aria-invalid={nameErr}
              onChange={(e) => setName(e.target.value)}
            />
            {nameErr && (
              <p className="text-destructive text-sm">{t('create.nameRequired')}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="dsdesc">{t('create.description')}</Label>
            <Textarea
              id="dsdesc"
              placeholder={t('create.descriptionPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? t('actions.save', { ns: 'common' }) : t('create.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
