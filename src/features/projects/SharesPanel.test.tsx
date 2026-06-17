import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import i18n from '@/i18n/i18n'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/utils'
import { SharesPanel } from '@/features/projects/SharesPanel'

beforeEach(async () => {
  await i18n.changeLanguage('zh-CN')
  server.use(
    http.get('*/v1/projects/p1/members', () =>
      HttpResponse.json([{ user_id: 'u-1', role: 'owner' }]),
    ),
    http.get('*/v1/projects/p1/shares', () =>
      HttpResponse.json([
        { id: 'sh1', project_id: 'p1', org_id: null, role: 'contributor' },
      ]),
    ),
    http.get('*/v1/orgs', () => HttpResponse.json([])),
  )
})

describe('SharesPanel', () => {
  it('shows an existing share and the add control for a manager', async () => {
    renderWithProviders(<SharesPanel projectId="p1" />)
    // 列表项的角色徽章（唯一）证明共享已渲染
    expect(await screen.findByText('Contributor')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '新增共享' })).toBeInTheDocument()
  })
})
