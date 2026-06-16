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
import { useProtocols, useStartRun } from '@/hooks/use-protocols'
import { useToastError } from '@/hooks/use-toast-error'
import type { Run } from '@/api/protocols'

export function StartRunDialog({
  projectId,
  open,
  onOpenChange,
  onStarted,
}: {
  projectId: string
  open: boolean
  onOpenChange: (o: boolean) => void
  onStarted?: (run: Run) => void
}) {
  const { t } = useTranslation('protocols')
  const protocols = useProtocols(projectId, { limit: 100 })
  const start = useStartRun(projectId)
  const toastError = useToastError()
  const [pid, setPid] = useState('')
  const [name, setName] = useState('')
  const [err, setErr] = useState<{ pid?: boolean; name?: boolean }>({})

  useEffect(() => {
    if (open) {
      setPid('')
      setName('')
      setErr({})
    }
  }, [open])

  const submit = async () => {
    const e = { pid: !pid, name: !name.trim() }
    setErr(e)
    if (e.pid || e.name) return
    try {
      const run = await start.mutateAsync({ pid, name })
      toast.success(t('run.started'))
      onOpenChange(false)
      onStarted?.(run)
    } catch (ex) {
      toastError(ex)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('run.start')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t('run.pickProtocol')}</Label>
            <Select value={pid} onValueChange={setPid}>
              <SelectTrigger aria-invalid={err.pid} className="w-full">
                <SelectValue placeholder={t('run.pickProtocol')} />
              </SelectTrigger>
              <SelectContent>
                {(protocols.data?.items ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="runname">{t('run.name')}</Label>
            <Input
              id="runname"
              placeholder={t('run.namePlaceholder')}
              value={name}
              aria-invalid={err.name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={start.isPending}>
            {start.isPending && <Loader2 className="size-4 animate-spin" />}
            {t('run.start')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
