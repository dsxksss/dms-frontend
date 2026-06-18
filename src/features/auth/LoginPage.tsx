import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/auth/auth-context'
import { AuthBrandPanel } from './AuthBrandPanel'

export function LoginPage() {
  const { t } = useTranslation('auth')
  const { login, status } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (status === 'authed') return <Navigate to="/projects" replace />

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login({ email, password })
      navigate('/projects')
    } catch {
      setError(t('login.invalid'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex h-screen">
      <AuthBrandPanel />
      <div className="flex flex-1 items-center justify-center bg-white px-6 md:max-w-[480px] md:flex-none">
        <form className="w-[340px]" onSubmit={onSubmit}>
          <div className="text-[22px] font-extrabold">
            {t('login.welcome')}{' '}
            <span className="text-[16px] font-semibold text-muted-foreground">
              {t('login.welcomeEn')}
            </span>
          </div>
          <div className="mt-1.5 text-[13px] text-muted-foreground">
            {t('login.welcomeSub')}
          </div>

          <div className="mt-[26px] space-y-1.5">
            <Label htmlFor="email" className="text-[12px] text-[#5a6473]">
              {t('login.email')}
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="mt-4 space-y-1.5">
            <Label htmlFor="password" className="text-[12px] text-[#5a6473]">
              {t('login.password')}
            </Label>
            <Input
              id="password"
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

          <div className="mt-4 text-center text-[12.5px] text-muted-foreground">
            {t('signup.haveAccount')}{' '}
            <button
              type="button"
              className="font-semibold text-brand"
              onClick={() => navigate('/signup')}
            >
              {t('signup.createAccount')} →
            </button>
          </div>
          <div className="mt-[22px] border-t pt-[18px] text-center">
            <button
              type="button"
              className="text-[12.5px] text-muted-foreground hover:text-foreground"
              onClick={() => navigate('/system/login')}
            >
              {t('login.platformConsole')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
