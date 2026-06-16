import { http, HttpResponse } from 'msw'

export const TOKENS = {
  access_token: 'access-1',
  refresh_token: 'refresh-1',
  token_type: 'Bearer',
}

export const ME = {
  user_id: 'u-1',
  tenant_id: 'acme',
  permissions: ['project:read', 'project:write', 'audit:read'],
}

/** RFC7807 错误体。 */
export function problem(status: number, detail?: string) {
  return HttpResponse.json(
    { type: 'about:blank', title: 'Error', status, detail },
    { status },
  )
}

export const handlers = [
  http.post('*/v1/auth/login', async ({ request }) => {
    const body = (await request.json()) as { password?: string }
    if (body.password === 'good') return HttpResponse.json(TOKENS)
    return problem(401, 'invalid credentials')
  }),
  http.post('*/v1/auth/refresh', async ({ request }) => {
    const body = (await request.json()) as { refresh_token?: string }
    if (body.refresh_token)
      return HttpResponse.json({
        access_token: 'access-2',
        refresh_token: 'refresh-2',
        token_type: 'Bearer',
      })
    return problem(401)
  }),
  http.post('*/v1/auth/logout', () => new HttpResponse(null, { status: 204 })),
  http.get('*/v1/me', ({ request }) => {
    if (request.headers.get('authorization')) return HttpResponse.json(ME)
    return problem(401)
  }),
]
