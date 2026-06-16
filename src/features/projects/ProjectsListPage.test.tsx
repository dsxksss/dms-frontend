import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import i18n from '@/i18n/i18n'
import { server } from '@/test/msw/server'
import { renderWithProviders, TEST_ME } from '@/test/utils'
import { ProjectsListPage } from '@/features/projects/ProjectsListPage'

function projectsHandler() {
  return http.get('*/v1/projects', () =>
    HttpResponse.json({
      items: [
        { id: 'p1', organization_id: null, name: 'Alpha', description: '', archived: false, version: 1 },
        { id: 'p2', organization_id: null, name: 'Beta', description: '', archived: true, version: 2 },
      ],
      total: 2,
      limit: 20,
      offset: 0,
    }),
  )
}

beforeEach(async () => {
  await i18n.changeLanguage('zh-CN')
})

describe('ProjectsListPage', () => {
  it('renders projects returned by the API', async () => {
    server.use(projectsHandler())
    renderWithProviders(<ProjectsListPage />)
    expect(await screen.findByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
  })

  it('shows the create action for users with project:write', async () => {
    server.use(projectsHandler())
    renderWithProviders(<ProjectsListPage />)
    await screen.findByText('Alpha')
    expect(screen.getByRole('button', { name: '新建项目' })).toBeInTheDocument()
  })

  it('hides the create action without project:write', async () => {
    server.use(projectsHandler())
    renderWithProviders(<ProjectsListPage />, {
      me: { ...TEST_ME, permissions: ['project:read'] },
    })
    await screen.findByText('Alpha')
    expect(
      screen.queryByRole('button', { name: '新建项目' }),
    ).not.toBeInTheDocument()
  })
})
