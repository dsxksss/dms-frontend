import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '@/i18n/i18n'
import { renderWithProviders } from '@/test/utils'
import { SignDialog } from '@/features/signatures/SignDialog'

beforeEach(async () => {
  await i18n.changeLanguage('zh-CN')
})

describe('SignDialog', () => {
  it('requires reason and password before signing', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <SignDialog
        projectId="p1"
        targetKind="run"
        targetId="r1"
        content="x"
        open
        onOpenChange={() => {}}
      />,
    )
    await user.click(screen.getByRole('button', { name: '签署' }))
    expect(await screen.findByText('请填写理由')).toBeInTheDocument()
    expect(screen.getByText('请输入密码')).toBeInTheDocument()
  })
})
