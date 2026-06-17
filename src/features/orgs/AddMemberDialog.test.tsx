import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import i18n from '@/i18n/i18n'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/utils'
import { AddMemberDialog } from '@/features/orgs/AddMemberDialog'

beforeEach(async () => {
  await i18n.changeLanguage('zh-CN')
})

describe('AddMemberDialog', () => {
  it('offers existing org members instead of a raw user-id field', async () => {
    server.use(
      http.get('*/v1/orgs/o1/members', () =>
        HttpResponse.json([
          { user_id: 'u-9', display_name: '李雷', email: 'lilei@acme.test', role: 'member' },
        ]),
      ),
    )
    renderWithProviders(
      <AddMemberDialog
        orgId="o1"
        open
        onOpenChange={() => {}}
        title="添加团队成员"
        onSubmit={async () => {}}
      />,
    )
    // 选项来自组织成员目录；不再有"用户 UUID"输入框。
    expect(await screen.findByText('李雷')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('用户 UUID')).not.toBeInTheDocument()
  })

  it('shows an empty state when the org has no members', async () => {
    server.use(
      http.get('*/v1/orgs/o2/members', () => HttpResponse.json([])),
    )
    renderWithProviders(
      <AddMemberDialog
        orgId="o2"
        open
        onOpenChange={() => {}}
        title="添加团队成员"
        onSubmit={async () => {}}
      />,
    )
    expect(await screen.findByText('该组织暂无可选成员')).toBeInTheDocument()
  })
})
