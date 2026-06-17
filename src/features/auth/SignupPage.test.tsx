import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '@/i18n/i18n'
import { renderWithProviders } from '@/test/utils'
import { SignupPage } from '@/features/auth/SignupPage'

beforeEach(async () => {
  await i18n.changeLanguage('zh-CN')
})

describe('SignupPage', () => {
  it('validates email and password', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SignupPage />, { me: null })
    await user.click(screen.getByRole('button', { name: '注册' }))
    expect(await screen.findByText('请输入邮箱')).toBeInTheDocument()
    expect(screen.getByText('请输入密码')).toBeInTheDocument()
  })

  it('does not ask for tenant by default, but reveals it on demand', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SignupPage />, { me: null })
    expect(screen.queryByLabelText('租户')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '切换租户' }))
    expect(screen.getByLabelText('租户')).toBeInTheDocument()
  })
})
