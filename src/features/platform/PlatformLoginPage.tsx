import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Loader2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useIsZh } from '@/components/bilingual'
import { usePlatformAuth } from '@/platform/platform-auth'

/**
 * 平台控制台登录（原型：居中深色强调卡，非品牌分栏）。
 * 登录走独立平台会话；已登录则直接进概览。
 */
export function PlatformLoginPage() {
  const { t } = useTranslation('platform')
  const isZh = useIsZh()
  const { me, login } = usePlatformAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (me) return <Navigate to="/system" replace />

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email, password)
      navigate('/system')
    } catch {
      setError(t('login.invalid'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0F1424] px-6 py-10">
      <form
        className="card-shadow w-[360px] rounded-[16px] border bg-card p-7"
        onSubmit={onSubmit}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-[10px] [&>svg]:size-5"
            style={{
              background: 'linear-gradient(135deg,#6D5BD0,#8E7DE8)',
              color: '#fff',
            }}
          >
            <ShieldCheck />
          </span>
          <div className="leading-tight">
            <div className="text-[16px] font-extrabold">
              {isZh ? '平台控制台' : 'Platform Console'}
            </div>
            {isZh && (
              <div className="text-[11px] text-muted-foreground">
                Platform Console
              </div>
            )}
          </div>
        </div>
        <p className="mt-2.5 text-[12px] text-muted-foreground">
          {t('login.subtitle')}
        </p>

        <div className="mt-6 space-y-1.5">
          <Label htmlFor="pf-email" className="text-[12px] text-[#5a6473]">
            {t('login.email')}
          </Label>
          <Input
            id="pf-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
        </div>
        <div className="mt-4 space-y-1.5">
          <Label htmlFor="pf-password" className="text-[12px] text-[#5a6473]">
            {t('login.password')}
          </Label>
          <Input
            id="pf-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && (
          <div className="mt-3 text-[12px] text-destructive">{error}</div>
        )}

        <Button
          type="submit"
          className="mt-6 h-11 w-full text-[14px]"
          disabled={submitting}
        >
          {submitting && <Loader2 className="size-4 animate-spin" />}
          {submitting ? t('login.submitting') : t('login.submit')}
        </Button>

        <div className="mt-[22px] border-t pt-[18px] text-center">
          <button
            type="button"
            className="text-[12.5px] text-muted-foreground hover:text-foreground"
            onClick={() => navigate('/login')}
          >
            ← {t('login.backToApp')}
          </button>
        </div>
      </form>
    </div>
  )
}
