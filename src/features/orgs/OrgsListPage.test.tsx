import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import i18n from '@/i18n/i18n'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/utils'
import { OrgsListPage } from '@/features/orgs/OrgsListPage'

beforeEach(async () => {
  await i18n.changeLanguage('zh-CN')
})

describe('OrgsListPage', () => {
  it('renders organizations and the create action', async () => {
    server.use(
      http.get('*/v1/orgs', () =>
        HttpResponse.json([{ id: 'o1', slug: 'research', name: 'R&D Center' }]),
      ),
      http.get('*/v1/me/permissions', () =>
        HttpResponse.json({ permissions: ['org:read', 'org:write'] }),
      ),
    )
    renderWithProviders(<OrgsListPage />)
    expect(await screen.findByText('R&D Center')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '新建组织' })).toBeInTheDocument()
  })
})
