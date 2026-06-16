import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import i18n from '@/i18n/i18n'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/utils'
import { CreateProjectDialog } from '@/features/projects/CreateProjectDialog'

beforeEach(async () => {
  await i18n.changeLanguage('zh-CN')
})

describe('CreateProjectDialog', () => {
  it('validates that name is required', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CreateProjectDialog open onOpenChange={() => {}} />)
    await user.click(screen.getByRole('button', { name: '创建' }))
    expect(await screen.findByText('请输入项目名称')).toBeInTheDocument()
  })

  it('creates a project and closes the dialog', async () => {
    let capturedName: string | undefined = undefined
    server.use(
      http.post('*/v1/projects', async ({ request }) => {
        const body = (await request.json()) as { name?: string }
        capturedName = body.name
        return HttpResponse.json(
          {
            id: 'p9',
            organization_id: null,
            name: body.name,
            description: '',
            archived: false,
            version: 1,
          },
          { status: 201 },
        )
      }),
    )
    const onOpenChange = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<CreateProjectDialog open onOpenChange={onOpenChange} />)

    await user.type(screen.getByLabelText('名称'), 'Gamma')
    await user.click(screen.getByRole('button', { name: '创建' }))

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    expect(capturedName).toBe('Gamma')
  })
})
