import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import i18n from '@/i18n/i18n'
import { server } from '@/test/msw/server'
import { renderWithProviders, TEST_ME } from '@/test/utils'
import { DatasetsListPage } from '@/features/datasets/DatasetsListPage'

function datasetsHandler() {
  return http.get('*/v1/datasets', () =>
    HttpResponse.json([
      {
        id: 'd1',
        owner_id: 'u-1',
        organization_id: null,
        name: 'Alpha set',
        description: '',
        visibility: 'private',
        version: 1,
      },
      {
        id: 'd2',
        owner_id: 'u-2',
        organization_id: null,
        name: 'Beta set',
        description: '',
        visibility: 'public',
        version: 1,
      },
    ]),
  )
}

beforeEach(async () => {
  await i18n.changeLanguage('zh-CN')
})

describe('DatasetsListPage', () => {
  it('renders datasets from the API', async () => {
    server.use(datasetsHandler())
    renderWithProviders(<DatasetsListPage />)
    expect(await screen.findByText('Alpha set')).toBeInTheDocument()
    expect(screen.getByText('Beta set')).toBeInTheDocument()
  })

  it('shows the create action with dataset:write', async () => {
    server.use(datasetsHandler())
    renderWithProviders(<DatasetsListPage />)
    await screen.findByText('Alpha set')
    expect(screen.getByRole('button', { name: '新建数据集' })).toBeInTheDocument()
  })

  it('hides the create action without dataset:write', async () => {
    server.use(datasetsHandler())
    renderWithProviders(<DatasetsListPage />, {
      me: { ...TEST_ME, permissions: ['dataset:read'] },
    })
    await screen.findByText('Alpha set')
    expect(
      screen.queryByRole('button', { name: '新建数据集' }),
    ).not.toBeInTheDocument()
  })
})
