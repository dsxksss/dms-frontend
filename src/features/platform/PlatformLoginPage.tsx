import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ThemeToggle } from '@/components/theme-toggle'
import { LangToggle } from '@/components/lang-toggle'
import { usePlatformAuth } from '@/platform/platform-auth'
import { errorI18nKey, isAppError } from '@/lib/errors'

export function PlatformLoginPage() {
  const { t } = useTranslation('platform')
  const { t: tc } = useTranslation('common')
  const { login } = usePlatformAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/platform'

  const schema = z.object({
    email: z
      .string()
      .min(1, t('login.required.email'))
      .email(t('login.required.emailFormat')),
    password: z.string().min(1, t('login.required.password')),
  })
  type Values = z.infer<typeof schema>

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })
  const [formError, setFormError] = useState<string | null>(null)

  const onSubmit = async (values: Values) => {
    setFormError(null)
    try {
      await login(values.email, values.password)
      navigate(from, { replace: true })
    } catch (e) {
      if (isAppError(e) && (e.kind === 'unauthorized' || e.kind === 'forbidden')) {
        setFormError(t('login.invalid'))
      } else {
        setFormError(tc(errorI18nKey(e)))
      }
    }
  }

  return (
    <main className="bg-background relative flex min-h-[100dvh] items-center justify-center p-6">
      <div className="absolute top-4 right-4 flex items-center gap-1">
        <LangToggle />
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <div className="bg-brand text-brand-foreground flex size-10 items-center justify-center rounded-lg font-semibold">
            P
          </div>
          <h1 className="text-xl font-semibold tracking-tight">
            {t('login.title')}
          </h1>
          <p className="text-muted-foreground text-sm">{t('login.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t('login.email')}</Label>
            <Input
              id="email"
              type="email"
              autoFocus
              autoComplete="username"
              aria-invalid={!!errors.email}
              {...register('email')}
            />
            {errors.email && (
              <p className="text-destructive text-sm">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t('login.password')}</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              {...register('password')}
            />
            {errors.password && (
              <p className="text-destructive text-sm">
                {errors.password.message}
              </p>
            )}
          </div>

          {formError && (
            <div
              role="alert"
              className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
            >
              {formError}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            {isSubmitting ? t('login.submitting') : t('login.submit')}
          </Button>
        </form>
      </div>
    </main>
  )
}
