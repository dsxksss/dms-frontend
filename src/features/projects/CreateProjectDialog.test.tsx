import { beforeAll, describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/utils'
import { CreateProjectDialog } from './CreateProjectDialog'

describe('CreateProjectDialog', () => {
  beforeAll(() => {
    if (!Element.prototype.hasPointerCapture) {
      Element.prototype.hasPointerCapture = () => false
    }
    if (!Element.prototype.setPointerCapture) {
      Element.prototype.setPointerCapture = () => {}
    }
    if (!Element.prototype.releasePointerCapture) {
      Element.prototype.releasePointerCapture = () => {}
    }
    if (!Element.prototype.scrollIntoView) {
      Element.prototype.scrollIntoView = () => {}
    }
  })

  it('opens the organization selector when no default org is loaded', async () => {
    server.use(http.get('*/v1/orgs', () => HttpResponse.json([])))

    renderWithProviders(
      <CreateProjectDialog open={true} onOpenChange={() => {}} />,
    )

    const user = userEvent.setup()
    await user.click(screen.getByRole('combobox', { name: /organization|组织/i }))

    expect(await screen.findAllByText(/my organization|我的组织/i)).toHaveLength(2)
  })
})
