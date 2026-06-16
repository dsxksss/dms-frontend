import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import i18n from '@/i18n/i18n'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/utils'
import { InboxPage } from '@/features/membership/InboxPage'

beforeEach(async () => {
  await i18n.changeLanguage('zh-CN')
})

describe('InboxPage', () => {
  it('lists my pending invitations with accept/decline', async () => {
    server.use(
      http.get('*/v1/me/invitations', () =>
        HttpResponse.json([
          {
            id: 'i1',
            kind: 'project',
            target_id: 'p1',
            target_name: 'Proj X',
            invitee_user_id: 'u-1',
            role: 'contributor',
            status: 'pending',
            message: '',
            created_at: '2026-06-16T00:00:00Z',
          },
        ]),
      ),
    )
    renderWithProviders(<InboxPage />)
    expect(await screen.findByText('Proj X')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '接受' })).toBeInTheDocument()
  })
})
