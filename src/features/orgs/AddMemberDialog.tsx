import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
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

export function AddMemberDialog({
  open,
  onOpenChange,
  title,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: string
  onSubmit: (userId: string, role: string) => Promise<void>
}) {
  const { t } = useTranslation('orgs')
  const [userId, setUserId] = useState('')
  const [role, setRole] = useState('member')
  const [err, setErr] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setUserId('')
      setRole('member')
      setErr(false)
    }
  }, [open])

  const submit = async () => {
    if (!userId.trim()) {
      setErr(true)
      return
    }
    setSubmitting(true)
    try {
      await onSubmit(userId.trim(), role)
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="muser">{t('addMember.userId')}</Label>
            <Input
              id="muser"
              autoFocus
              placeholder={t('addMember.userIdPlaceholder')}
              value={userId}
              aria-invalid={err}
              onChange={(e) => setUserId(e.target.value)}
            />
            {err && (
              <p className="text-destructive text-sm">{t('addMember.userRequired')}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>{t('addMember.role')}</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">{t('orgRole.admin')}</SelectItem>
                <SelectItem value="member">{t('orgRole.member')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              {t('addMember.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
