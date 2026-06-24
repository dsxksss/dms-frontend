import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Loader2, PenLine } from 'lucide-react'
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
import { InfoHint } from '@/components/info-hint'
import { Textarea } from '@/components/ui/textarea'
import { useSign } from '@/hooks/use-signatures'
import { isAppError } from '@/lib/errors'
import { cn } from '@/lib/utils'
import type { SignatureMeaning } from '@/api/signatures'

const MEANINGS: SignatureMeaning[] = [
  'authored',
  'reviewed',
  'approved',
  'responsibility',
]

/** 就「所见内容」算 sha256（事后核对内容未被篡改，Part 11 §11.70）。 */
async function contentHashOf(kind: string, id: string, name: string) {
  const canonical = `${kind}:${id}:${name}`
  const buf = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(canonical),
  )
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** 电子签名 MODAL（21 CFR Part 11 §11.200）：含义 + 重新认证密码 + 理由。 */
export function SignDialog({
  projectId,
  open,
  onOpenChange,
  target,
}: {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  target: { kind: string; id: string; name: string }
}) {
  const { t } = useTranslation('signatures')
  const sign = useSign(projectId)
  const [meaning, setMeaning] = useState<SignatureMeaning>('approved')
  const [reason, setReason] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  // 打开时重置表单与错误。
  useEffect(() => {
    if (open) {
      setMeaning('approved')
      setReason('')
      setPassword('')
      setError(null)
    }
  }, [open])

  const submit = async () => {
    setError(null)
    if (!password) {
      setError(t('sign.passwordRequired'))
      return
    }
    try {
      const content_hash = await contentHashOf(
        target.kind,
        target.id,
        target.name,
      )
      await sign.mutateAsync({
        target_kind: target.kind,
        target_id: target.id,
        meaning,
        reason: reason.trim(),
        content_hash,
        password,
      })
      toast.success(t('sign.signed'))
      onOpenChange(false)
    } catch (e) {
      // 403 = 重新认证失败（密码错误）。
      if (isAppError(e) && e.status === 403) {
        setError(t('sign.wrongPassword'))
      } else {
        setError(isAppError(e) && e.detail ? e.detail : t('sign.title'))
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-accent text-brand">
              <PenLine className="size-4" />
            </span>
            {t('sign.title')}
            <span className="mono text-[11px] font-semibold text-muted-foreground">
              21 CFR Part 11 §11.200
            </span>
          </DialogTitle>
          <DialogDescription>{target.name}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              {t('sign.meaning')}
              <InfoHint>{t('sign.meaningHint')}</InfoHint>
            </Label>
            <div className="flex flex-wrap gap-2">
              {MEANINGS.map((m) => {
                const active = meaning === m
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMeaning(m)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors',
                      active
                        ? 'border-brand bg-accent text-brand'
                        : 'border-divider text-muted-foreground hover:border-[#dbe1ea]',
                    )}
                  >
                    {t(`meaning.${m}`)}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sign-reason">{t('sign.reason')}</Label>
            <Textarea
              id="sign-reason"
              placeholder={t('sign.reasonPlaceholder')}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sign-pw">{t('sign.password')}</Label>
            <Input
              id="sign-pw"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              {t('sign.passwordHint')}
            </p>
            {error && (
              <p className="text-[11.5px] font-semibold text-destructive">
                {error}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('actions.cancel', { ns: 'common', defaultValue: '取消' })}
          </Button>
          <Button onClick={submit} disabled={!password || sign.isPending}>
            {sign.isPending && <Loader2 className="size-4 animate-spin" />}
            {t('sign.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
