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
import { ThemeToggle } from '@/components/theme-toggle'
import { LangToggle } from '@/components/lang-toggle'
import { useAuth } from '@/auth/auth-context'
import { errorI18nKey, isAppError } from '@/lib/errors'

export function SignupPage() {
  const { t } = useTranslation('auth')
  const { t: tc } = useTranslation('common')
  const { signupUser } = useAuth()
  const navigate = useNavigate()

  const schema = z.object({
    tenant: z.string(),
    name: z.string(),
    email: z
      .string()
      .min(1, t('signup.required.email'))
      .email(t('signup.required.emailFormat')),
    password: z.string().min(1, t('signup.required.password')),
  })
  type Values = z.infer<typeof schema>

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { tenant: '', name: '', email: '', password: '' },
  })
  const [formError, setFormError] = useState<string | null>(null)

  const onSubmit = async (v: Values) => {
    setFormError(null)
    try {
      await signupUser({
        tenant: v.tenant || undefined,
        name: v.name || undefined,
        email: v.email,
        password: v.password,
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
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-semibold tracking-tight">
            {t('signup.userTitle')}
          </h1>
          <p className="text-muted-foreground text-sm">{t('signup.userSubtitle')}</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('signup.name')}</Label>
            <Input id="name" autoFocus placeholder={t('signup.namePlaceholder')} {...register('name')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t('login.email')}</Label>
            <Input id="email" type="email" autoComplete="username" aria-invalid={!!errors.email} {...register('email')} />
            {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t('login.password')}</Label>
            <Input id="password" type="password" autoComplete="new-password" aria-invalid={!!errors.password} {...register('password')} />
            {errors.password && <p className="text-destructive text-sm">{errors.password.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenant">{t('login.tenant')}</Label>
            <Input id="tenant" placeholder={t('login.tenantPlaceholder')} {...register('tenant')} />
          </div>
          {formError && (
            <div role="alert" className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm">
              {formError}
            </div>
          )}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            {t('signup.submitUser')}
          </Button>
        </form>
        <p className="text-muted-foreground mt-4 text-center text-sm">
          <Link to="/login" className="text-brand hover:underline">
            {t('signup.haveAccount')}
          </Link>
        </p>
      </div>
    </main>
  )
}
