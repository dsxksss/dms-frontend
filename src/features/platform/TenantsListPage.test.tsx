import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import i18n from '@/i18n/i18n'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/utils'
import { TenantsListPage } from '@/features/platform/TenantsListPage'

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

beforeEach(async () => {
  await i18n.changeLanguage('zh-CN')
})

describe('TenantsListPage', () => {
  it('renders tenants with plan badge and the provision action', async () => {
    server.use(
      http.get('*/v1/platform/tenants', () =>
        HttpResponse.json({ items: [TENANT], total: 1, limit: 20, offset: 0 }),
      ),
    )
    renderWithProviders(<TenantsListPage />)
    expect(await screen.findByText('恒瑞医药')).toBeInTheDocument()
    expect(screen.getByText('标准版')).toBeInTheDocument()
    expect(screen.getByText('启用中')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '开通企业' }),
    ).toBeInTheDocument()
  })

  it('shows the empty state when there are no tenants', async () => {
    server.use(
      http.get('*/v1/platform/tenants', () =>
        HttpResponse.json({ items: [], total: 0, limit: 20, offset: 0 }),
      ),
    )
    renderWithProviders(<TenantsListPage />)
    expect(await screen.findByText('暂无企业')).toBeInTheDocument()
  })
})
