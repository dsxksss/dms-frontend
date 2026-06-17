import { describe, it, expect, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import i18n from '@/i18n/i18n'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/utils'
import { PlatformSettingsPage } from '@/features/platform/PlatformSettingsPage'

const CATALOG = [
  {
    key: 'signup.tenant_enabled',
    label: '企业自助开通',
    value_type: 'bool',
    apply: 'live',
    editable: true,
    secret: false,
    value: true,
  },
  {
    key: 'storage.backend',
    label: '存储后端',
    value_type: 'string',
    apply: 'restart',
    editable: false,
    secret: false,
    value: 'local',
  },
]

beforeEach(async () => {
  await i18n.changeLanguage('zh-CN')
})

describe('PlatformSettingsPage', () => {
  it('renders the catalog with read-only items marked', async () => {
    server.use(
      http.get('*/v1/platform/settings', () => HttpResponse.json(CATALOG)),
    )
    renderWithProviders(<PlatformSettingsPage />)
    expect(await screen.findByText('企业自助开通')).toBeInTheDocument()
    expect(screen.getByText('存储后端')).toBeInTheDocument()
    // 只读项有标记，且只读值直接展示
    expect(screen.getAllByText('只读').length).toBeGreaterThan(0)
    expect(screen.getByText('local')).toBeInTheDocument()
  })

  it('PATCHes only the changed key on save', async () => {
    let patched: Record<string, unknown> | null = null
    server.use(
      http.get('*/v1/platform/settings', () => HttpResponse.json(CATALOG)),
      http.patch('*/v1/platform/settings', async ({ request }) => {
        patched = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(CATALOG)
      }),
    )
    const user = userEvent.setup()
    renderWithProviders(<PlatformSettingsPage />)
    await screen.findByText('企业自助开通')

    // 切换 bool 开关（role=switch）
    await user.click(screen.getByRole('switch'))
    await user.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => expect(patched).toEqual({ 'signup.tenant_enabled': false }))
  })
})
