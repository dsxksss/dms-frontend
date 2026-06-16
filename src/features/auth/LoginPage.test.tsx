import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import i18n from '@/i18n/i18n'
import { AuthProvider } from '@/auth/AuthProvider'
import { LoginPage } from '@/features/auth/LoginPage'

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<div>HOME_OK</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

beforeEach(async () => {
  await i18n.changeLanguage('zh-CN')
})

describe('LoginPage', () => {
  it('shows validation errors for empty fields', async () => {
    const user = userEvent.setup()
    renderLogin()
    await user.click(screen.getByRole('button', { name: '登录' }))
    expect(await screen.findByText('请输入租户')).toBeInTheDocument()
    expect(screen.getByText('请输入邮箱')).toBeInTheDocument()
    expect(screen.getByText('请输入密码')).toBeInTheDocument()
  })

  it('signs in and navigates home on valid credentials', async () => {
    const user = userEvent.setup()
    renderLogin()
    await user.type(screen.getByLabelText('租户'), 'acme')
    await user.type(screen.getByLabelText('邮箱'), 'admin@acme.test')
    await user.type(screen.getByLabelText('密码'), 'good')
    await user.click(screen.getByRole('button', { name: '登录' }))
    expect(await screen.findByText('HOME_OK')).toBeInTheDocument()
  })

  it('shows an error message on invalid credentials', async () => {
    const user = userEvent.setup()
    renderLogin()
    await user.type(screen.getByLabelText('租户'), 'acme')
    await user.type(screen.getByLabelText('邮箱'), 'admin@acme.test')
    await user.type(screen.getByLabelText('密码'), 'wrong')
    await user.click(screen.getByRole('button', { name: '登录' }))
    expect(
      await screen.findByText('租户、邮箱或密码不正确'),
    ).toBeInTheDocument()
  })
})
