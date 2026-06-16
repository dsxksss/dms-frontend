import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import i18n from '@/i18n/i18n'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/utils'
import { RunsPanel } from '@/features/protocols/RunsPanel'

beforeEach(async () => {
  await i18n.changeLanguage('zh-CN')
  server.use(
    http.get('*/v1/projects/p1/members', () =>
      HttpResponse.json([{ user_id: 'u-1', role: 'owner' }]),
    ),
    http.get('*/v1/projects/p1/protocols', () =>
      HttpResponse.json({ items: [], total: 0, limit: 100, offset: 0 }),
    ),
    http.get('*/v1/projects/p1/runs', () =>
      HttpResponse.json({
        items: [
          {
            id: 'r1',
            project_id: 'p1',
            protocol_id: 'pr1',
            protocol_version: 1,
            name: 'Run A',
            status: 'in_progress',
            steps: [],
            results: {},
            performed_by: 'u-1',
            started_at: '2026-06-16T00:00:00Z',
            completed_at: null,
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

describe('RunsPanel', () => {
  it('renders runs with status and the start action', async () => {
    renderWithProviders(<RunsPanel projectId="p1" />)
    expect(await screen.findByText('Run A')).toBeInTheDocument()
    expect(screen.getByText('进行中')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '发起执行' })).toBeInTheDocument()
  })
})
