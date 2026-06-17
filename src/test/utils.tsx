import type { ReactElement, ReactNode } from 'react'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router-dom'
import i18n from '@/i18n/i18n'
import { AuthContext, type AuthContextValue } from '@/auth/auth-context'
import { Toaster } from '@/components/ui/sonner'
import type { Me } from '@/api/types'

export const TEST_ME: Me = {
  user_id: 'u-1',
  tenant_id: 'acme',
  permissions: [
    'project:read',
    'project:write',
    'dataset:read',
    'dataset:write',
    'org:read',
    'org:write',
    'audit:read',
  ],
}

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}

export function renderWithProviders(
  ui: ReactElement,
  opts: { me?: Me | null; route?: string } = {},
) {
  const { me = TEST_ME, route = '/' } = opts
  const auth: AuthContextValue = {
    status: me ? 'authed' : 'anon',
    me,
    login: async () => {},
    signupUser: async () => {},
    signupTenant: async () => {},
    logout: async () => {},
  }
  const qc = makeQueryClient()

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={qc}>
          <AuthContext.Provider value={auth}>
            <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
            <Toaster />
          </AuthContext.Provider>
        </QueryClientProvider>
      </I18nextProvider>
    )
  }

  return render(ui, { wrapper: Wrapper })
}
