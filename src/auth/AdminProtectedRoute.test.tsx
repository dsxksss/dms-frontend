import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import i18n from '@/i18n/i18n'
import { renderWithProviders, TEST_ME } from '@/test/utils'
import { AdminProtectedRoute } from '@/auth/AdminProtectedRoute'

function tree() {
  return (
    <Routes>
      <Route element={<AdminProtectedRoute />}>
        <Route path="/system" element={<div>ADMIN_OK</div>} />
      </Route>
    </Routes>
  )
}

beforeEach(async () => {
  await i18n.changeLanguage('zh-CN')
})

describe('AdminProtectedRoute', () => {
  it('renders admin content for users with an admin permission', async () => {
    renderWithProviders(tree(), { route: '/system', me: TEST_ME })
    expect(await screen.findByText('ADMIN_OK')).toBeInTheDocument()
  })

  it('blocks users without admin permission', async () => {
    renderWithProviders(tree(), {
      route: '/system',
      me: { ...TEST_ME, permissions: ['project:read'] },
    })
    expect(await screen.findByText('无后台权限')).toBeInTheDocument()
    expect(screen.queryByText('ADMIN_OK')).not.toBeInTheDocument()
  })
})
