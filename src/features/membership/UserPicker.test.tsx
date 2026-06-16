import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import i18n from '@/i18n/i18n'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/utils'
import { UserPicker } from '@/features/membership/UserPicker'

beforeEach(async () => {
  await i18n.changeLanguage('zh-CN')
})

describe('UserPicker', () => {
  it('searches the directory and selects a user', async () => {
    server.use(
      http.get('*/v1/users', () =>
        HttpResponse.json([
          { id: 'u-9', display_name: 'Alice Lee', email: 'alice@acme.test' },
        ]),
      ),
    )
    const onChange = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<UserPicker value={[]} onChange={onChange} />)

    await user.type(screen.getByPlaceholderText('输入姓名或邮箱搜索…'), 'al')
    await user.click(await screen.findByText('Alice Lee'))

    expect(onChange).toHaveBeenCalledWith([
      { id: 'u-9', display_name: 'Alice Lee', email: 'alice@acme.test' },
    ])
  })
})
