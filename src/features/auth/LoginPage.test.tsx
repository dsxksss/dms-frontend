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
  it('asks only for email and password (no tenant field by default)', async () => {
    const user = userEvent.setup()
    renderLogin()
    expect(screen.queryByLabelText('企业')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '登录' }))
    expect(await screen.findByText('请输入邮箱')).toBeInTheDocument()
    expect(screen.getByText('请输入密码')).toBeInTheDocument()
  })

  it('signs in and navigates home on valid credentials', async () => {
    const user = userEvent.setup()
    renderLogin()
    await user.type(screen.getByLabelText('邮箱'), 'admin@acme.test')
    await user.type(screen.getByLabelText('密码'), 'good')
    await user.click(screen.getByRole('button', { name: '登录' }))
    expect(await screen.findByText('HOME_OK')).toBeInTheDocument()
  })

  it('shows an error message on invalid credentials', async () => {
    const user = userEvent.setup()
    renderLogin()
    await user.type(screen.getByLabelText('邮箱'), 'admin@acme.test')
    await user.type(screen.getByLabelText('密码'), 'wrong')
    await user.click(screen.getByRole('button', { name: '登录' }))
    expect(await screen.findByText('邮箱或密码不正确')).toBeInTheDocument()
  })

  it('reveals the company field via the switch link', async () => {
    const user = userEvent.setup()
    renderLogin()
    await user.click(screen.getByRole('button', { name: '指定企业' }))
    expect(screen.getByLabelText('企业')).toBeInTheDocument()
  })
})
