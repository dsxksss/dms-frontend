import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import i18n from '@/i18n/i18n'
import {
  PlatformAuthContext,
  type PlatformAuthValue,
} from '@/platform/platform-auth'
import { PlatformProtectedRoute } from '@/platform/PlatformProtectedRoute'
import type { PlatformMe } from '@/platform/api'

function renderGuard(value: PlatformAuthValue, route = '/platform') {
  return render(
    <I18nextProvider i18n={i18n}>
      <PlatformAuthContext.Provider value={value}>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path="/platform/login" element={<div>LOGIN</div>} />
            <Route element={<PlatformProtectedRoute />}>
              <Route path="/platform" element={<div>PLATFORM_OK</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </PlatformAuthContext.Provider>
    </I18nextProvider>,
  )
}

const ADMIN_ME: PlatformMe = {
  platform_admin: true,
  id: 'p1',
  email: 'root@platform.test',
}

const base: PlatformAuthValue = {
  status: 'anon',
  me: null,
  login: async () => {},
  logout: async () => {},
}

beforeEach(async () => {
  await i18n.changeLanguage('zh-CN')
})

describe('PlatformProtectedRoute', () => {
  it('renders content for a platform admin', async () => {
    renderGuard({ ...base, status: 'authed', me: ADMIN_ME })
    expect(await screen.findByText('PLATFORM_OK')).toBeInTheDocument()
  })

  it('redirects anonymous visitors to the platform login', async () => {
    renderGuard(base)
    expect(await screen.findByText('LOGIN')).toBeInTheDocument()
    expect(screen.queryByText('PLATFORM_OK')).not.toBeInTheDocument()
  })

  it('blocks an authed non-platform-admin', async () => {
    renderGuard({
      ...base,
      status: 'authed',
      me: { ...ADMIN_ME, platform_admin: false },
    })
    expect(await screen.findByText('无平台权限')).toBeInTheDocument()
    expect(screen.queryByText('PLATFORM_OK')).not.toBeInTheDocument()
  })
})
