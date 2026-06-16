import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ThemeToggle } from '@/components/theme-toggle'
import { LangToggle } from '@/components/lang-toggle'
import { useAuth } from '@/auth/auth-context'
import { errorI18nKey, isAppError } from '@/lib/errors'
import { tenantFromHost } from '@/lib/tenant'

const LAST_TENANT_KEY = 'dms-last-tenant'

function readDefaultTenant(): string | undefined {
  const env = (import.meta.env.VITE_DEFAULT_TENANT as string | undefined)?.trim()
  return env || undefined
}

/** 部署在租户子域名(如 acme.dms.app)时由 Host 推断租户，与后端规则一致。 */
function readHostTenant(): string | undefined {
  const suffix = (import.meta.env.VITE_TENANT_HOST_SUFFIX as string | undefined)?.trim()
  return tenantFromHost(window.location.hostname, suffix) ?? undefined
}

export function LoginPage() {
  const { t } = useTranslation('auth')
  const { t: tc } = useTranslation('common')
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  // 租户解析优先级：子域名 Host → 邀请链接 ?tenant= → 上次登录 → 部署默认(env) → 空。
  const hostTenant = readHostTenant()
  const urlTenant = searchParams.get('tenant')?.trim() || undefined
  const lastTenant = localStorage.getItem(LAST_TENANT_KEY) || undefined
  const defaultTenant = readDefaultTenant()
  const initialTenant =
    hostTenant ?? urlTenant ?? lastTenant ?? defaultTenant ?? ''
  // 租户已由子域名/链接/部署默认确定时，默认隐藏输入（普通用户无需关心）。
  const [showTenant, setShowTenant] = useState(
    !(hostTenant || urlTenant || defaultTenant),
  )

  const schema = z.object({
    tenant: z.string().min(1, t('login.required.tenant')),
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
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { tenant: initialTenant, email: '', password: '' },
  })
  const [formError, setFormError] = useState<string | null>(null)

  const onSubmit = async (values: Values) => {
    setFormError(null)
    try {
      await login(values)
      localStorage.setItem(LAST_TENANT_KEY, values.tenant)
      navigate(from, { replace: true })
    } catch (e) {
      if (isAppError(e) && e.kind === 'unauthorized') {
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
            D
          </div>
          <h1 className="text-xl font-semibold tracking-tight">
            {t('login.title')}
          </h1>
          <p className="text-muted-foreground text-sm">{t('login.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {/* 租户：已知时折叠为一行说明，可点“切换”展开。注册的 input 始终存在以保留值。 */}
          <div className={showTenant ? 'space-y-2' : 'hidden'}>
            <Label htmlFor="tenant">{t('login.tenant')}</Label>
            <Input
              id="tenant"
              autoFocus={showTenant}
              autoComplete="organization"
              placeholder={t('login.tenantPlaceholder')}
              aria-invalid={!!errors.tenant}
              {...register('tenant')}
            />
            {errors.tenant && (
              <p className="text-destructive text-sm">{errors.tenant.message}</p>
            )}
          </div>
          {!showTenant && (
            <p className="text-muted-foreground text-sm">
              {t('login.tenant')}:{' '}
              <span className="text-foreground font-medium">{watch('tenant')}</span>
              <button
                type="button"
                className="text-brand ml-2 hover:underline"
                onClick={() => setShowTenant(true)}
              >
                {t('login.switchTenant')}
              </button>
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">{t('login.email')}</Label>
            <Input
              id="email"
              type="email"
              autoFocus={!showTenant}
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
              <p className="text-destructive text-sm">{errors.password.message}</p>
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
