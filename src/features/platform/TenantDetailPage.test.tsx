import { describe, it, expect, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router-dom'
import i18n from '@/i18n/i18n'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/utils'
import { TenantDetailPage } from '@/features/platform/TenantDetailPage'

const TENANT = {
  id: 't1',
  slug: 'acme',
  name: '恒瑞医药',
  plan: 'standard',
  max_orgs: 5,
  max_users_per_org: 20,
  storage_bytes: 107374182400,
  active: true,
  created_at: '2026-06-16T08:00:00Z',
  usage: { orgs: 3, users: 42, storage_used: 5242880 },
}

function renderDetail() {
  return renderWithProviders(
    <Routes>
      <Route path="/platform/tenants/:id" element={<TenantDetailPage />} />
    </Routes>,
    { route: '/platform/tenants/t1' },
  )
}

beforeEach(async () => {
  await i18n.changeLanguage('zh-CN')
})

describe('TenantDetailPage', () => {
  it('renders name, plan and usage/quota', async () => {
    server.use(
      http.get('*/v1/platform/tenants/t1', () => HttpResponse.json(TENANT)),
    )
    renderDetail()
    expect(await screen.findByText('恒瑞医药')).toBeInTheDocument()
    // 「标准版」出现在头部徽章与套餐下拉，至少一处。
    expect(screen.getAllByText('标准版').length).toBeGreaterThan(0)
    expect(screen.getByText('用量 / 配额')).toBeInTheDocument()
  })

  it('suspends an active tenant after confirmation', async () => {
    let suspended = false
    server.use(
      http.get('*/v1/platform/tenants/t1', () =>
        HttpResponse.json({ ...TENANT, active: !suspended }),
      ),
      http.post('*/v1/platform/tenants/t1/suspend', () => {
        suspended = true
        return HttpResponse.json({ ...TENANT, active: false })
      }),
    )
    const user = userEvent.setup()
    renderDetail()
    await screen.findByText('恒瑞医药')

    // 生命周期卡片里的「停用」触发按钮
    const triggers = screen.getAllByRole('button', { name: '停用' })
    await user.click(triggers[0])

    // 确认弹窗出现后点确认（取最后一个同名按钮 = AlertDialogAction）
    await screen.findByText(/确认停用/)
    const confirmButtons = screen.getAllByRole('button', { name: '停用' })
    await user.click(confirmButtons[confirmButtons.length - 1])

    await waitFor(() => expect(suspended).toBe(true))
  })
})
