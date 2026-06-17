import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

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
import { ThemeToggle } from '@/components/theme-toggle'
import { LangToggle } from '@/components/lang-toggle'
import { useAuth } from '@/auth/auth-context'
import { errorI18nKey, isAppError } from '@/lib/errors'

const PLANS = ['demo', 'standard', 'enterprise'] as const

export function SignupTenantPage() {
  const { t } = useTranslation('auth')
  const { t: tc } = useTranslation('common')
  const { signupTenant } = useAuth()
  const navigate = useNavigate()

  const schema = z.object({
    company_name: z.string().min(1, t('signup.required.company')),
    slug: z.string().min(1, t('signup.required.slug')),
    plan: z.enum(PLANS),
    admin_name: z.string(),
    admin_email: z
      .string()
      .min(1, t('signup.required.email'))
      .email(t('signup.required.emailFormat')),
    admin_password: z.string().min(1, t('signup.required.password')),
  })
  type Values = z.infer<typeof schema>

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      company_name: '',
      slug: '',
      plan: 'standard',
      admin_name: '',
      admin_email: '',
      admin_password: '',
    },
  })
  const [formError, setFormError] = useState<string | null>(null)

  const onSubmit = async (v: Values) => {
    setFormError(null)
    try {
      await signupTenant({
        company_name: v.company_name,
        slug: v.slug,
        plan: v.plan,
        admin_name: v.admin_name || undefined,
        admin_email: v.admin_email,
        admin_password: v.admin_password,
      })
      navigate('/', { replace: true })
    } catch (e) {
      setFormError(isAppError(e) && e.detail ? e.detail : tc(errorI18nKey(e)))
    }
  }

  return (
    <main className="bg-background relative flex min-h-[100dvh] items-center justify-center p-6">
      <div className="absolute top-4 right-4 flex items-center gap-1">
        <LangToggle />
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-semibold tracking-tight">
            {t('signup.tenantTitle')}
          </h1>
          <p className="text-muted-foreground text-sm">{t('signup.tenantSubtitle')}</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="company">{t('signup.company')}</Label>
              <Input id="company" autoFocus placeholder={t('signup.companyPlaceholder')} aria-invalid={!!errors.company_name} {...register('company_name')} />
              {errors.company_name && <p className="text-destructive text-sm">{errors.company_name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">{t('signup.slug')}</Label>
              <Input id="slug" placeholder={t('signup.slugPlaceholder')} aria-invalid={!!errors.slug} {...register('slug')} />
              {errors.slug && <p className="text-destructive text-sm">{errors.slug.message}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('signup.plan')}</Label>
            <Select value={watch('plan')} onValueChange={(v) => setValue('plan', v as Values['plan'])}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PLANS.map((p) => (
                  <SelectItem key={p} value={p}>{t(`signup.plans.${p}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="aname">{t('signup.name')}</Label>
            <Input id="aname" placeholder={t('signup.namePlaceholder')} {...register('admin_name')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="aemail">{t('login.email')}</Label>
            <Input id="aemail" type="email" autoComplete="username" aria-invalid={!!errors.admin_email} {...register('admin_email')} />
            {errors.admin_email && <p className="text-destructive text-sm">{errors.admin_email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="apw">{t('login.password')}</Label>
            <Input id="apw" type="password" autoComplete="new-password" aria-invalid={!!errors.admin_password} {...register('admin_password')} />
            {errors.admin_password && <p className="text-destructive text-sm">{errors.admin_password.message}</p>}
          </div>
          {formError && (
            <div role="alert" className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm">
              {formError}
            </div>
          )}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            {t('signup.submitTenant')}
          </Button>
        </form>
        <p className="text-muted-foreground mt-4 text-center text-sm">
          <Link to="/login" className="text-brand hover:underline">
            {t('signup.toLogin')}
          </Link>
        </p>
      </div>
    </main>
  )
}
