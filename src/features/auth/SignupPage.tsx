import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LangToggle } from '@/components/lang-toggle'
import { AuthBrandPanel } from '@/features/auth/AuthBrandPanel'
import { useAuth } from '@/auth/auth-context'
import { errorI18nKey, isAppError } from '@/lib/errors'
import { resolveTenant } from '@/lib/tenant'

export function SignupPage() {
  const { t } = useTranslation('auth')
  const { t: tc } = useTranslation('common')
  const { signupUser } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // 同登录：企业由子域名 / ?tenant= / 上次 / 默认 自动解析，用户无需在注册时指定。
  const resolvedTenant = resolveTenant(searchParams.get('tenant')) || undefined

  const schema = z.object({
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
    defaultValues: { email: '', password: '' },
  })
  const [formError, setFormError] = useState<string | null>(null)

  const onSubmit = async (v: Values) => {
    setFormError(null)
    try {
      await signupUser({
        tenant: resolvedTenant,
        email: v.email,
        password: v.password,
      })
      navigate('/', { replace: true })
    } catch (e) {
      if (isAppError(e) && e.kind === 'validation') {
        setFormError(t('login.tenantNeeded'))
      } else {
        setFormError(isAppError(e) && e.detail ? e.detail : tc(errorI18nKey(e)))
      }
    }
  }

  return (
    <main className="flex h-[100dvh]">
      <AuthBrandPanel />

      <div className="bg-card relative flex flex-1 items-center justify-center lg:w-[480px] lg:flex-none">
        <div className="absolute top-4 right-4">
          <LangToggle />
        </div>

        <div className="w-[340px] max-w-[86vw]">
          <h1 className="text-[22px] font-extrabold">{t('signup.userTitle')}</h1>
          <p className="text-muted-foreground mt-1.5 text-[13px]">
            {t('signup.userSubtitle')}
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
                autoComplete="new-password"
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
              {t('signup.submitUser')}
            </Button>
          </form>

          <p className="text-muted-foreground mt-4 text-center text-[12.5px]">
            <Link to="/login" className="text-brand font-semibold hover:underline">
              {t('signup.haveAccount')}
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
