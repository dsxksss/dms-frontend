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

  // 租户解析优先级：子域名 Host → ?tenant= → 上次登录 → 部署默认。解析不到则交给后端按 Host 推断。
  const resolvedTenant =
    readHostTenant() ??
    (searchParams.get('tenant')?.trim() || undefined) ??
    (localStorage.getItem(LAST_TENANT_KEY) || undefined) ??
    readDefaultTenant() ??
    ''
  // 默认不显示租户输入；仅当后端报“需要租户”或用户手动展开时出现。
  const [showTenant, setShowTenant] = useState(false)

  const schema = z.object({
    tenant: z.string().optional(),
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
    defaultValues: { tenant: resolvedTenant, email: '', password: '' },
  })
  const [formError, setFormError] = useState<string | null>(null)

  const onSubmit = async (values: Values) => {
    setFormError(null)
    const tenant = values.tenant?.trim() || undefined
    try {
      await login({ tenant, email: values.email, password: values.password })
      if (tenant) localStorage.setItem(LAST_TENANT_KEY, tenant)
      navigate(from, { replace: true })
    } catch (e) {
      if (isAppError(e) && e.kind === 'validation') {
        // 后端无法确定租户 → 展开输入框让用户补一次。
        setShowTenant(true)
        setFormError(t('login.tenantNeeded'))
      } else if (isAppError(e) && e.kind === 'unauthorized') {
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

          {/* 租户：默认不渲染；解析到的值由 defaultValues 保留，提交时仍带上。 */}
          {showTenant && (
            <div className="space-y-2">
              <Label htmlFor="tenant">{t('login.tenant')}</Label>
              <Input
                id="tenant"
                autoComplete="organization"
                placeholder={t('login.tenantPlaceholder')}
                {...register('tenant')}
              />
            </div>
          )}

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

          {!showTenant && (
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground mx-auto block text-xs"
              onClick={() => setShowTenant(true)}
            >
              {t('login.switchTenant')}
            </button>
          )}
        </form>
      </div>
    </main>
  )
}
