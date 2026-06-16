import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import i18n from '@/i18n/i18n'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/utils'
import { SignaturesPanel } from '@/features/signatures/SignaturesPanel'

beforeEach(async () => {
  await i18n.changeLanguage('zh-CN')
})

describe('SignaturesPanel', () => {
  it('renders signatures with signer and meaning', async () => {
    server.use(
      http.get('*/v1/projects/p1/signatures', () =>
        HttpResponse.json({
          items: [
            {
              id: 's1',
              project_id: 'p1',
              target_kind: 'run',
              target_id: 'r1',
              signer_id: 'u-1',
              signer_name: 'Dr. Lin',
              meaning: 'approved',
              reason: 'Reviewed and approved',
              content_hash: 'abc123def456',
              signed_at: '2026-06-16T00:00:00Z',
            },
          ],
          total: 1,
          limit: 20,
          offset: 0,
        }),
      ),
    )
    renderWithProviders(<SignaturesPanel projectId="p1" />)
    expect(await screen.findByText('Dr. Lin')).toBeInTheDocument()
    expect(screen.getByText('批准')).toBeInTheDocument()
  })
})
