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
import { LangToggle } from '@/components/lang-toggle'
import { BrandMark } from '@/components/brand-mark'
import { usePlatformAuth } from '@/platform/platform-auth'
import { errorI18nKey, isAppError } from '@/lib/errors'

export function PlatformLoginPage() {
  const { t } = useTranslation('platform')
  const { t: tc } = useTranslation('common')
  const { login } = usePlatformAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/system'

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
    <main className="flex h-[100dvh]">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-[#161A2B] p-12 text-white lg:flex lg:flex-1">
        <div className="relative z-10 flex items-center gap-3">
          <BrandMark variant="platform" className="size-[34px]" />
          <div className="text-[18px] font-extrabold">{t('title')}</div>
        </div>
        <div className="relative z-10 max-w-[420px]">
          <h1 className="text-[30px] leading-[1.3] font-extrabold tracking-tight">
            {t('login.title')}
          </h1>
          <p className="mt-4 text-[14px] leading-[1.7] text-[#9AA0C4]">
            {t('overview.desc')}
          </p>
        </div>
        <div className="relative z-10 text-[12px] text-[#8990B5]">
          Platform Console · machine-bound license
        </div>
        <div className="absolute -right-24 -bottom-24 size-80 rounded-full bg-[#6D5BD0]/20" />
        <div className="absolute top-24 right-16 size-40 rounded-full bg-white/5" />
      </div>

      <div className="bg-card relative flex flex-1 items-center justify-center lg:w-[480px] lg:flex-none">
        <div className="absolute top-4 right-4">
          <LangToggle />
        </div>

        <div className="w-[340px] max-w-[86vw]">
          <h1 className="text-[22px] font-extrabold">{t('login.title')}</h1>
          <p className="text-muted-foreground mt-1.5 text-[13px]">
            {t('login.subtitle')}
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
                <p className="text-destructive text-xs">
                  {errors.password.message}
                </p>
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
        </div>
      </div>
    </main>
  )
}
