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
  const { login, loginWemol, status } = useAuth()
  const navigate = useNavigate()
  // WeMol SSO 默认为首选入口（云端 + 私有化）；未配置 WeMol 的部署可置
  // VITE_WEMOL_SSO=off，登录页默认邮箱 + 密码、WeMol 作次选（仍可切换）。
  const wemolDefault = import.meta.env.VITE_WEMOL_SSO !== 'off'
  const [mode, setMode] = useState<'wemol' | 'password'>(
    wemolDefault ? 'wemol' : 'password',
  )
  const [account, setAccount] = useState('')
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
      if (mode === 'wemol') {
        await loginWemol({ name: account, passwd: password })
      } else {
        await login({ email, password })
      }
      navigate('/projects')
    } catch {
      setError(mode === 'wemol' ? t('login.wemol.invalid') : t('login.invalid'))
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

          {mode === 'wemol' ? (
            <div className="mt-[26px] space-y-1.5">
              <Label htmlFor="wemol-account" className="text-[12px] text-[#5a6473]">
                {t('login.wemol.account')}
              </Label>
              <Input
                id="wemol-account"
                autoComplete="username"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
              />
            </div>
          ) : (
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
          )}
          <div className="mt-4 space-y-1.5">
            <Label htmlFor="password" className="text-[12px] text-[#5a6473]">
              {mode === 'wemol' ? t('login.wemol.password') : t('login.password')}
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
            {submitting
              ? t('login.submitting')
              : mode === 'wemol'
                ? t('login.wemol.submit')
                : t('login.submit')}
          </Button>

          <button
            type="button"
            className="mt-3 w-full text-center text-[12.5px] font-semibold text-brand"
            onClick={() => {
              setError('')
              setMode((m) => (m === 'wemol' ? 'password' : 'wemol'))
            }}
          >
            {mode === 'wemol' ? t('login.wemol.useEmail') : t('login.wemol.useWemol')}
          </button>

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
