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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EmptyState } from '@/components/states'
import { useOrgMembers } from '@/hooks/use-membership'

export function AddMemberDialog({
  orgId,
  open,
  onOpenChange,
  title,
  onSubmit,
}: {
  /** 团队成员须已是组织成员 → 候选从该组织成员中选，避免手填 user_id。 */
  orgId: string
  open: boolean
  onOpenChange: (o: boolean) => void
  title: string
  onSubmit: (userId: string, role: string) => Promise<void>
}) {
  const { t } = useTranslation('orgs')
  const members = useOrgMembers(orgId)
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
    if (!userId) {
      setErr(true)
      return
    }
    setSubmitting(true)
    try {
      await onSubmit(userId, role)
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
        {members.data && members.data.length === 0 ? (
          <EmptyState title={t('addMember.empty')} />
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              void submit()
            }}
          >
            <div className="space-y-2">
              <Label>{t('addMember.user')}</Label>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger aria-invalid={err} className="w-full">
                  <SelectValue placeholder={t('addMember.userPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {(members.data ?? []).map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {m.display_name || m.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {err && (
                <p className="text-destructive text-sm">
                  {t('addMember.userRequired')}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t('addMember.role')}</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="w-full">
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
        )}
      </DialogContent>
    </Dialog>
  )
}
