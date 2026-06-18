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
import { useStartRun } from '@/hooks/use-protocols'
import { useToastError } from '@/hooks/use-toast-error'
import type { Run } from '@/api/protocols'

/** 从方案发起一次执行：填执行名 → 后端快照方案步骤。 */
export function StartRunDialog({
  projectId,
  protocolId,
  open,
  onOpenChange,
  onStarted,
}: {
  projectId: string
  protocolId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onStarted?: (run: Run) => void
}) {
  const { t } = useTranslation('protocols')
  const toastError = useToastError()
  const start = useStartRun(projectId)
  const [name, setName] = useState('')

  useEffect(() => {
    if (open) setName('')
  }, [open])

  const submit = async () => {
    if (!name.trim()) return
    try {
      const run = await start.mutateAsync({ pid: protocolId, name: name.trim() })
      toast.success(t('run.started'))
      onOpenChange(false)
      onStarted?.(run)
    } catch (e) {
      toastError(e)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{t('run.start')}</DialogTitle>
          <DialogDescription>{t('run.emptyDesc')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="run-name">{t('run.name')}</Label>
          <Input
            id="run-name"
            placeholder={t('run.namePlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('actions.cancel', { ns: 'common', defaultValue: '取消' })}
          </Button>
          <Button onClick={submit} disabled={!name.trim() || start.isPending}>
            {start.isPending && <Loader2 className="size-4 animate-spin" />}
            {t('run.start')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
