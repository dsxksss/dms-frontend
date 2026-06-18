import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import i18n from '@/i18n/i18n'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/utils'
import { AuditPage } from '@/features/audit/AuditPage'

beforeEach(async () => {
  await i18n.changeLanguage('zh-CN')
})

describe('AuditPage', () => {
  it('renders audit entries with actor, ip and action', async () => {
    server.use(
      http.get('*/v1/audit', () =>
        HttpResponse.json({
          items: [
            {
              id: 'a1',
              occurred_at: '2026-06-16T00:00:00Z',
              actor_id: 'u-1',
              user_name: 'Admin User',
              user_handle: 'admin@acme.test',
              ip_address: '127.0.0.1',
              action: 'create',
              event_description: 'project: create',
              entity_type: 'project',
              entity_id: 'p1',
              changes: { name: { new: 'x' } },
              request_id: null,
            },
          ],
          total: 1,
          limit: 20,
          offset: 0,
        }),
      ),
    )
    renderWithProviders(<AuditPage />)
    expect(await screen.findByText('Admin User')).toBeInTheDocument()
    expect(screen.getByText(/127\.0\.0\.1/)).toBeInTheDocument()
    expect(screen.getByText('create')).toBeInTheDocument()
  })
})
