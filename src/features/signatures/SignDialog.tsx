import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, PenLine } from 'lucide-react'
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
import { useSign } from '@/hooks/use-signatures'
import { useToastError } from '@/hooks/use-toast-error'
import { sha256Hex } from '@/lib/sha256'
import { cn } from '@/lib/utils'
import type { SignatureMeaning } from '@/api/signatures'

const MEANINGS: SignatureMeaning[] = [
  'authored',
  'reviewed',
  'approved',
  'responsibility',
]

/** 对 targetKind/targetId 进行电子签名；content 为「所见内容」，提交时算 sha256。 */
export function SignDialog({
  projectId,
  targetKind,
  targetId,
  content,
  open,
  onOpenChange,
}: {
  projectId: string
  targetKind: string
  targetId: string
  content: string
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const { t } = useTranslation('signatures')
  const sign = useSign(projectId)
  const toastError = useToastError()
  const [meaning, setMeaning] = useState<SignatureMeaning>('approved')
  const [reason, setReason] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<{ reason?: boolean; password?: boolean }>({})

  useEffect(() => {
    if (open) {
      setMeaning('approved')
      setReason('')
      setPassword('')
      setErr({})
    }
  }, [open])

  const submit = async () => {
    const e = { reason: !reason.trim(), password: !password }
    setErr(e)
    if (e.reason || e.password) return
    try {
      const content_hash = await sha256Hex(content)
      await sign.mutateAsync({
        target_kind: targetKind,
        target_id: targetId,
        meaning,
        reason: reason.trim(),
        content_hash,
        password,
      })
      toast.success(t('sign.signed'))
      onOpenChange(false)
    } catch (ex) {
      toastError(ex)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="bg-accent text-brand flex size-11 shrink-0 items-center justify-center rounded-[12px]">
              <PenLine className="size-5" />
            </span>
            <div>
              <DialogTitle>{t('sign.title')}</DialogTitle>
              <p className="text-muted-foreground mt-0.5 text-[11.5px]">
                21 CFR Part 11 · §11.200
              </p>
            </div>
          </div>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t('sign.meaning')}</Label>
            <div className="flex flex-wrap gap-2">
              {MEANINGS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMeaning(m)}
                  className={cn(
                    'rounded-[9px] border px-3 py-1.5 text-[12.5px] font-semibold transition-colors',
                    meaning === m
                      ? 'border-brand bg-accent text-brand'
                      : 'text-secondary-foreground hover:bg-background',
                  )}
                >
                  {t(`meaning.${m}`)}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sig-reason">{t('sign.reason')}</Label>
            <Textarea
              id="sig-reason"
              placeholder={t('sign.reasonPlaceholder')}
              value={reason}
              aria-invalid={err.reason}
              onChange={(e) => setReason(e.target.value)}
            />
            {err.reason && (
              <p className="text-destructive text-sm">{t('sign.reasonRequired')}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="sig-pw">{t('sign.password')}</Label>
            <Input
              id="sig-pw"
              type="password"
              autoComplete="current-password"
              value={password}
              aria-invalid={err.password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">{t('sign.passwordHint')}</p>
            {err.password && (
              <p className="text-destructive text-sm">
                {t('sign.passwordRequired')}
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={sign.isPending}>
            {sign.isPending && <Loader2 className="size-4 animate-spin" />}
            {t('sign.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
