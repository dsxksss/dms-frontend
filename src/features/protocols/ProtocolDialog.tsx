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
import { useCreateProtocol, useUpdateProtocol } from '@/hooks/use-protocols'
import { useToastError } from '@/hooks/use-toast-error'
import { autoSlug } from '@/lib/slug'
import type { Protocol, ProtocolStep } from '@/api/protocols'
import { StepBuilder } from './StepBuilder'

/** 新建 / 编辑方案：名称 + 描述 + 步骤。key 由名称自动派生（用户无需手填）。 */
export function ProtocolDialog({
  projectId,
  open,
  onOpenChange,
  protocol,
}: {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  protocol?: Protocol
}) {
  const { t } = useTranslation('protocols')
  const toastError = useToastError()
  const isEdit = !!protocol
  const create = useCreateProtocol(projectId)
  const update = useUpdateProtocol(projectId, protocol?.id ?? '')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [steps, setSteps] = useState<ProtocolStep[]>([])

  useEffect(() => {
    if (open) {
      setName(protocol?.name ?? '')
      setDescription(protocol?.description ?? '')
      setSteps(protocol?.steps ?? [])
    }
  }, [open, protocol])

  const pending = create.isPending || update.isPending

  const submit = async () => {
    if (!name.trim()) return
    try {
      if (isEdit && protocol) {
        await update.mutateAsync({
          name: name.trim(),
          description: description.trim(),
          steps,
          version: protocol.version,
        })
        toast.success(t('protocol.updated'))
      } else {
        await create.mutateAsync({
          key: autoSlug(name, 'proto'),
          name: name.trim(),
          description: description.trim() || undefined,
          steps,
        })
        toast.success(t('protocol.created'))
      }
      onOpenChange(false)
    } catch (e) {
      toastError(e)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] gap-4 overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t('protocol.edit') : t('protocol.create')}
          </DialogTitle>
          <DialogDescription>{t('subtitle')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="proto-name">{t('protocol.name')}</Label>
            <Input
              id="proto-name"
              placeholder={t('protocol.namePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="proto-desc">{t('protocol.description')}</Label>
            <Textarea
              id="proto-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t('steps.title')}</Label>
            <StepBuilder value={steps} onChange={setSteps} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('actions.cancel', { ns: 'common', defaultValue: '取消' })}
          </Button>
          <Button onClick={submit} disabled={!name.trim() || pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            {isEdit
              ? t('actions.save', { ns: 'common', defaultValue: '保存' })
              : t('protocol.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
