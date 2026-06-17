import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import i18n from '@/i18n/i18n'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/utils'
import { DatasetsPanel } from '@/features/datasets/DatasetsPanel'

const MEMBERS = [{ user_id: 'u-1', role: 'manager' }]

function handlers() {
  return [
    http.get('*/v1/projects/p1/members', () => HttpResponse.json(MEMBERS)),
    http.get('*/v1/projects/p1/datasets', () =>
      HttpResponse.json([
        { id: 'd1', project_id: 'p1', name: 'Alpha set', description: '', version: 1 },
        { id: 'd2', project_id: 'p1', name: 'Beta set', description: '', version: 2 },
      ]),
    ),
  ]
}

beforeEach(async () => {
  await i18n.changeLanguage('zh-CN')
})

describe('DatasetsPanel', () => {
  it('renders the project datasets', async () => {
    server.use(...handlers())
    renderWithProviders(<DatasetsPanel projectId="p1" />)
    expect(await screen.findByText('Alpha set')).toBeInTheDocument()
    expect(screen.getByText('Beta set')).toBeInTheDocument()
  })

  it('shows the create action for a manager (Contributor+)', async () => {
    server.use(...handlers())
    renderWithProviders(<DatasetsPanel projectId="p1" />)
    await screen.findByText('Alpha set')
    expect(
      screen.getByRole('button', { name: '新建数据集' }),
    ).toBeInTheDocument()
  })

  it('hides the create action for a viewer', async () => {
    server.use(
      http.get('*/v1/projects/p1/members', () =>
        HttpResponse.json([{ user_id: 'u-1', role: 'viewer' }]),
      ),
      http.get('*/v1/projects/p1/datasets', () =>
        HttpResponse.json([
          { id: 'd1', project_id: 'p1', name: 'Alpha set', description: '', version: 1 },
        ]),
      ),
    )
    renderWithProviders(<DatasetsPanel projectId="p1" />)
    await screen.findByText('Alpha set')
    expect(
      screen.queryByRole('button', { name: '新建数据集' }),
    ).not.toBeInTheDocument()
  })
})
