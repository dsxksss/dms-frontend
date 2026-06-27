import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/auth/auth-context'
import { useToastError } from '@/hooks/use-toast-error'
import { AuthBrandPanel } from './AuthBrandPanel'

export function SignupPage() {
  const { t } = useTranslation('auth')
  const { signupUser, status } = useAuth()
  const navigate = useNavigate()
  const toastError = useToastError()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (status === 'authed') return <Navigate to="/projects" replace />

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await signupUser({ email, password, name: name || undefined })
      navigate('/projects')
    } catch (err) {
      toastError(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex h-screen">
      <AuthBrandPanel />
      <div className="flex flex-1 items-center justify-center bg-white px-6 md:max-w-[480px] md:flex-none">
        <form className="w-[340px]" onSubmit={onSubmit}>
          <div className="text-[22px] font-extrabold">{t('signup.userTitle')}</div>
          <div className="mt-1.5 text-[13px] text-muted-foreground">
            {t('signup.userSubtitle')}
          </div>

          <div className="mt-[26px] space-y-1.5">
            <Label htmlFor="name" className="text-[12px] text-[#5a6473]">
              {t('account')}
            </Label>
            <Input
              id="name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="mt-4 space-y-1.5">
            <Label htmlFor="email" className="text-[12px] text-[#5a6473]">
              {t('login.email')}
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
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
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <Button
            type="submit"
            className="mt-6 h-11 w-full text-[14px]"
            disabled={submitting}
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {t('signup.submitUser')}
          </Button>

          <div className="mt-4 text-center text-[12.5px] text-muted-foreground">
            <button
              type="button"
              className="font-semibold text-brand"
              onClick={() => navigate('/login')}
            >
              {t('signup.haveAccount')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
