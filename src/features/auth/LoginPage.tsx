import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ThemeToggle } from '@/components/theme-toggle'
import { LangToggle } from '@/components/lang-toggle'
import { useAuth } from '@/auth/auth-context'
import { errorI18nKey, isAppError } from '@/lib/errors'
import { LAST_TENANT_KEY, resolveTenant } from '@/lib/tenant'

export function LoginPage({ adminMode = false }: { adminMode?: boolean }) {
  const { t } = useTranslation('auth')
  const { t: tc } = useTranslation('common')
  const { t: ta } = useTranslation('admin')
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const from =
    (location.state as { from?: string } | null)?.from ??
    (adminMode ? '/admin' : '/')

  // 企业由后端按邮箱反查 / 子域名 / ?tenant= / 默认 自动解析，用户无需在登录时指定。
  const resolvedTenant = resolveTenant(searchParams.get('tenant')) || undefined

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
      await login({ tenant: resolvedTenant, email: values.email, password: values.password })
      if (resolvedTenant) localStorage.setItem(LAST_TENANT_KEY, resolvedTenant)
      navigate(from, { replace: true })
    } catch (e) {
      if (isAppError(e) && e.kind === 'unauthorized') {
        setFormError(t('login.invalid'))
      } else if (isAppError(e) && e.kind === 'validation') {
        // 极少数：后端无法识别企业（云端邮箱反查通常已覆盖）。给出指引而非要求手填。
        setFormError(t('login.tenantNeeded'))
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
            {adminMode ? 'A' : 'D'}
          </div>
          <h1 className="text-xl font-semibold tracking-tight">
            {adminMode ? ta('login.title') : t('login.title')}
          </h1>
          <p className="text-muted-foreground text-sm">
            {adminMode ? ta('login.subtitle') : t('login.subtitle')}
          </p>
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

        {/* 企业开通改由平台管理员在后台进行，前台不再提供自助开通入口；这里只留普通用户注册。 */}
        {!adminMode && import.meta.env.VITE_SIGNUP_ENABLED !== 'false' && (
          <div className="text-muted-foreground mt-4 flex justify-center gap-4 text-sm">
            <Link to="/signup" className="text-brand hover:underline">
              {t('signup.createAccount')}
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
