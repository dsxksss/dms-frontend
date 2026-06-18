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
import { LangToggle } from '@/components/lang-toggle'
import { AuthBrandPanel } from '@/features/auth/AuthBrandPanel'
import { useAuth } from '@/auth/auth-context'
import { errorI18nKey, isAppError } from '@/lib/errors'
import { resolveTenant } from '@/lib/tenant'

export function LoginPage() {
  const { t } = useTranslation('auth')
  const { t: tc } = useTranslation('common')
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

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
      await login({
        tenant: resolvedTenant,
        email: values.email,
        password: values.password,
      })
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

  const signupEnabled = import.meta.env.VITE_SIGNUP_ENABLED !== 'false'

  return (
    <main className="flex h-[100dvh]">
      <AuthBrandPanel />

      <div className="bg-card relative flex flex-1 items-center justify-center lg:w-[480px] lg:flex-none">
        <div className="absolute top-4 right-4">
          <LangToggle />
        </div>

        <div className="w-[340px] max-w-[86vw]">
          <h1 className="text-[22px] font-extrabold">
            {t('login.welcome')}{' '}
            {t('login.welcomeEn') && (
              <span className="text-muted-foreground text-[16px] font-semibold">
                {t('login.welcomeEn')}
              </span>
            )}
          </h1>
          <p className="text-muted-foreground mt-1.5 text-[13px]">
            {t('login.welcomeSub')}
          </p>

          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="mt-[26px] space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-[#5a6473]">
                {t('login.email')}
              </Label>
              <Input
                id="email"
                type="email"
                autoFocus
                autoComplete="username"
                aria-invalid={!!errors.email}
                {...register('email')}
              />
              {errors.email && (
                <p className="text-destructive text-xs">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-xs font-semibold text-[#5a6473]"
              >
                {t('login.password')}
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={!!errors.password}
                {...register('password')}
              />
              {errors.password && (
                <p className="text-destructive text-xs">{errors.password.message}</p>
              )}
            </div>

            {formError && (
              <div
                role="alert"
                className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-[13px]"
              >
                {formError}
              </div>
            )}

            <Button
              type="submit"
              className="h-11 w-full text-sm"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {isSubmitting ? t('login.submitting') : t('login.submit')}
            </Button>
          </form>

          {signupEnabled && (
            <div className="text-muted-foreground mt-4 text-center text-[12.5px]">
              {t('signup.haveAccount')}{' '}
              <Link to="/signup" className="text-brand font-semibold hover:underline">
                {t('signup.createAccount')} →
              </Link>
            </div>
          )}

          <div className="mt-[22px] border-t pt-[18px] text-center">
            <Link
              to="/system/login"
              className="text-muted-foreground hover:text-foreground text-[12.5px]"
            >
              {t('login.platformConsole')}
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
