import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import i18n from '@/i18n/i18n'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/utils'
import { FilesPanel } from '@/features/files/FilesPanel'

beforeEach(async () => {
  await i18n.changeLanguage('zh-CN')
})

describe('FilesPanel', () => {
  it('renders files and shows upload for a contributor+', async () => {
    server.use(
      http.get('*/v1/projects/p1/members', () =>
        HttpResponse.json([{ user_id: 'u-1', role: 'owner' }]),
      ),
      http.get('*/v1/projects/p1/files', () =>
        HttpResponse.json({
          items: [
            {
              id: 'f1',
              project_id: 'p1',
              category: 'misc',
              folder: '',
              name: 'note.txt',
              sha256: 'abc',
              size: 12,
              content_type: 'text/plain',
            },
          ],
          total: 1,
          limit: 20,
          offset: 0,
        }),
      ),
    )
    renderWithProviders(<FilesPanel projectId="p1" />)
    expect(await screen.findByText('note.txt')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '上传到此处' })).toBeInTheDocument()
  })
})
