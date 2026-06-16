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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateDataset, useUpdateDataset } from '@/hooks/use-datasets'
import { useToastError } from '@/hooks/use-toast-error'
import type { Dataset, Visibility } from '@/api/datasets'

const VISIBILITIES: Visibility[] = ['private', 'org', 'public']

export function CreateDatasetDialog({
  open,
  onOpenChange,
  dataset,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  dataset?: Dataset | null
}) {
  const { t } = useTranslation('datasets')
  const isEdit = !!dataset
  const create = useCreateDataset()
  const update = useUpdateDataset(dataset?.id ?? '')
  const toastError = useToastError()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<Visibility>('private')
  const [nameErr, setNameErr] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setName(dataset?.name ?? '')
      setDescription(dataset?.description ?? '')
      setVisibility(dataset?.visibility ?? 'private')
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
        await update.mutateAsync({
          name,
          description,
          visibility,
          version: dataset.version,
        })
        toast.success(t('toast.updated'))
      } else {
        await create.mutateAsync({ name, description, visibility })
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
          <div className="space-y-2">
            <Label>{t('create.visibility')}</Label>
            <Select
              value={visibility}
              onValueChange={(v) => setVisibility(v as Visibility)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISIBILITIES.map((v) => (
                  <SelectItem key={v} value={v}>
                    {t(`visibility.${v}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
