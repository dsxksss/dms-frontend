import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import i18n from '@/i18n/i18n'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/utils'
import { ProtocolsPanel } from '@/features/protocols/ProtocolsPanel'

beforeEach(async () => {
  await i18n.changeLanguage('zh-CN')
  server.use(
    http.get('*/v1/projects/p1/members', () =>
      HttpResponse.json([{ user_id: 'u-1', role: 'owner' }]),
    ),
    http.get('*/v1/projects/p1/protocols', () =>
      HttpResponse.json({
        items: [
          {
            id: 'pr1',
            project_id: 'p1',
            key: 'pcr',
            name: 'PCR setup',
            description: '',
            steps: [{ name: 'mix', description: '', fields: [] }],
            archived: false,
            version: 1,
          },
        ],
        total: 1,
        limit: 20,
        offset: 0,
      }),
    ),
  )
})

describe('ProtocolsPanel', () => {
  it('renders protocols and the create action for a manager', async () => {
    renderWithProviders(<ProtocolsPanel projectId="p1" />)
    expect(await screen.findByText('PCR setup')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '新建方案' })).toBeInTheDocument()
  })
})
