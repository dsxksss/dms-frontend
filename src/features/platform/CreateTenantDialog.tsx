import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { autoSlug } from '@/lib/slug'
import { PLAN_OPTIONS } from './plans'

export function CreateTenantDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const { t } = useTranslation('platform')
  const navigate = useNavigate()
  const create = useCreateTenant()
  const toastError = useToastError()
  const [form, setForm] = useState({
    company_name: '',
    slug: '',
    plan: 'standard',
    admin_email: '',
    admin_password: '',
    admin_name: '',
  })
  const [err, setErr] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (open) {
      setForm({
        company_name: '',
        slug: '',
        plan: 'standard',
        admin_email: '',
        admin_password: '',
        admin_name: '',
      })
      setErr({})
    }
  }, [open])

  const set = (k: keyof typeof form) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }))

  const submit = async () => {
    const e = {
      company_name: !form.company_name.trim(),
      admin_email: !form.admin_email.trim(),
      admin_password: !form.admin_password.trim(),
    }
    setErr(e)
    if (Object.values(e).some(Boolean)) return
    try {
      const created = await create.mutateAsync({
        company_name: form.company_name.trim(),
        // slug 留空时按企业名自动派生（中文名回退随机）。
        slug: form.slug.trim() || autoSlug(form.company_name, 'org'),
        plan: form.plan,
        admin_email: form.admin_email.trim(),
        admin_password: form.admin_password,
        admin_name: form.admin_name.trim() || undefined,
      })
      toast.success(t('tenants.create.done'))
      onOpenChange(false)
      navigate(created.id)
    } catch (ex) {
      toastError(ex)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('tenants.create.title')}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="tcompany">{t('tenants.create.company')}</Label>
              <Input
                id="tcompany"
                autoFocus
                value={form.company_name}
                aria-invalid={err.company_name}
                onChange={(e) => set('company_name')(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tslug">{t('tenants.create.slug')}</Label>
              <Input
                id="tslug"
                placeholder={t('tenants.create.slugAuto')}
                value={form.slug}
                onChange={(e) => set('slug')(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('tenants.create.plan')}</Label>
            <Select value={form.plan} onValueChange={set('plan')}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLAN_OPTIONS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {t(`plan.${p}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              {t('tenants.create.planHint')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tadminEmail">
              {t('tenants.create.adminEmail')}
            </Label>
            <Input
              id="tadminEmail"
              type="email"
              value={form.admin_email}
              aria-invalid={err.admin_email}
              onChange={(e) => set('admin_email')(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="tadminPwd">
                {t('tenants.create.adminPassword')}
              </Label>
              <Input
                id="tadminPwd"
                type="password"
                value={form.admin_password}
                aria-invalid={err.admin_password}
                onChange={(e) => set('admin_password')(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tadminName">
                {t('tenants.create.adminName')}
              </Label>
              <Input
                id="tadminName"
                value={form.admin_name}
                onChange={(e) => set('admin_name')(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending && <Loader2 className="size-4 animate-spin" />}
              {t('tenants.create.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
