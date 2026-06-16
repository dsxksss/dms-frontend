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
import { useCreateProtocol, useUpdateProtocol } from '@/hooks/use-protocols'
import { useToastError } from '@/hooks/use-toast-error'
import type { Protocol, ProtocolStep } from '@/api/protocols'
import { StepBuilder } from './StepBuilder'

export function ProtocolDialog({
  projectId,
  open,
  onOpenChange,
  protocol,
}: {
  projectId: string
  open: boolean
  onOpenChange: (o: boolean) => void
  protocol?: Protocol | null
}) {
  const { t } = useTranslation('protocols')
  const isEdit = !!protocol
  const create = useCreateProtocol(projectId)
  const update = useUpdateProtocol(projectId, protocol?.id ?? '')
  const toastError = useToastError()

  const [key, setKey] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [steps, setSteps] = useState<ProtocolStep[]>([])
  const [errors, setErrors] = useState<{ key?: string; name?: string }>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setKey(protocol?.key ?? '')
      setName(protocol?.name ?? '')
      setDescription(protocol?.description ?? '')
      setSteps(protocol?.steps ?? [])
      setErrors({})
    }
  }, [open, protocol])

  const submit = async () => {
    const errs: typeof errors = {}
    if (!isEdit && !key.trim()) errs.key = t('protocol.keyRequired')
    if (!name.trim()) errs.name = t('protocol.nameRequired')
    setErrors(errs)
    if (Object.keys(errs).length) return

    setSubmitting(true)
    try {
      if (isEdit && protocol) {
        await update.mutateAsync({ name, description, steps, version: protocol.version })
        toast.success(t('protocol.updated'))
      } else {
        await create.mutateAsync({ key, name, description, steps })
        toast.success(t('protocol.created'))
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
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t('protocol.edit') : t('protocol.create')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!isEdit && (
            <div className="space-y-2">
              <Label htmlFor="pkey">{t('protocol.key')}</Label>
              <Input
                id="pkey"
                autoFocus
                placeholder={t('protocol.keyPlaceholder')}
                value={key}
                aria-invalid={!!errors.key}
                onChange={(e) => setKey(e.target.value)}
              />
              {errors.key && <p className="text-destructive text-sm">{errors.key}</p>}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="pname">{t('protocol.name')}</Label>
            <Input
              id="pname"
              autoFocus={isEdit}
              placeholder={t('protocol.namePlaceholder')}
              value={name}
              aria-invalid={!!errors.name}
              onChange={(e) => setName(e.target.value)}
            />
            {errors.name && <p className="text-destructive text-sm">{errors.name}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="pdesc">{t('protocol.description')}</Label>
            <Textarea
              id="pdesc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <StepBuilder value={steps} onChange={setSteps} />
        </div>

        <DialogFooter>
          <Button onClick={submit} disabled={submitting}>
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {isEdit ? t('actions.save', { ns: 'common' }) : t('protocol.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
