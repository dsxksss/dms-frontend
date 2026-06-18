import { useState } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateTenant } from '@/hooks/use-platform'
import { useToastError } from '@/hooks/use-toast-error'
import { autoSlug, slugify } from '@/lib/slug'
import { PLAN_OPTIONS, planLabel } from './plans'

/** 开通企业：企业名 + 可选 slug（留空自动生成）+ 档位 + 管理员账号。 */
export function CreateTenantDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation('platform')
  const create = useCreateTenant()
  const toastError = useToastError()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [plan, setPlan] = useState<string>('demo')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminName, setAdminName] = useState('')

  const reset = () => {
    setName('')
    setSlug('')
    setPlan('demo')
    setAdminEmail('')
    setAdminPassword('')
    setAdminName('')
  }

  const canSubmit =
    !!name.trim() && !!adminEmail.trim() && !!adminPassword && !create.isPending

  const submit = async () => {
    if (!canSubmit) return
    try {
      await create.mutateAsync({
        company_name: name.trim(),
        slug: slug.trim() || slugify(name) || autoSlug(name, 'co'),
        plan,
        admin_email: adminEmail.trim(),
        admin_password: adminPassword,
        admin_name: adminName.trim() || undefined,
      })
      toast.success(t('tenants.create.done'))
      onOpenChange(false)
      reset()
    } catch (e) {
      toastError(e)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{t('tenants.create.title')}</DialogTitle>
          <DialogDescription>{t('tenants.subtitle')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ct-name">{t('tenants.create.company')}</Label>
            <Input
              id="ct-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ct-slug">{t('tenants.create.slug')}</Label>
            <Input
              id="ct-slug"
              placeholder={t('tenants.create.slugPlaceholder')}
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              {t('tenants.create.slugAuto')}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>{t('tenants.create.plan')}</Label>
            <Select value={plan} onValueChange={setPlan}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLAN_OPTIONS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {planLabel(p, t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              {t('tenants.create.planHint')}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ct-email">{t('tenants.create.adminEmail')}</Label>
              <Input
                id="ct-email"
                type="email"
                autoComplete="off"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ct-pass">{t('tenants.create.adminPassword')}</Label>
              <Input
                id="ct-pass"
                type="password"
                autoComplete="new-password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ct-aname">{t('tenants.create.adminName')}</Label>
            <Input
              id="ct-aname"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('actions.cancel', { ns: 'common', defaultValue: '取消' })}
          </Button>
          <Button onClick={submit} disabled={!canSubmit}>
            {create.isPending && <Loader2 className="size-4 animate-spin" />}
            {t('tenants.create.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
