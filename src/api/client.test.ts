import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { problem } from '@/test/msw/handlers'
import { request } from '@/api/client'
import { useSession } from '@/auth/session'

beforeEach(() => {
  useSession.getState().setSession({
    tenant: 'acme',
    accessToken: 'expired',
    refreshToken: 'refresh-1',
  })
})

describe('api client', () => {
  it('attaches the Bearer token and returns parsed JSON', async () => {
    server.use(
      http.get('*/v1/thing', ({ request }) => {
        expect(request.headers.get('authorization')).toBe('Bearer expired')
        return HttpResponse.json({ ok: true })
      }),
    )
    const data = await request<{ ok: boolean }>('/v1/thing')
    expect(data.ok).toBe(true)
  })

  it('on 401 refreshes once and replays with the new access token', async () => {
    server.use(
      http.get('*/v1/thing', ({ request }) =>
        request.headers.get('authorization') === 'Bearer access-2'
          ? HttpResponse.json({ ok: true })
          : problem(401),
      ),
    )
    const data = await request<{ ok: boolean }>('/v1/thing')
    expect(data.ok).toBe(true)
    expect(useSession.getState().accessToken).toBe('access-2')
    expect(useSession.getState().refreshToken).toBe('refresh-2')
  })

  it('coalesces concurrent 401s into a single refresh (single-flight)', async () => {
    let refreshCalls = 0
    server.use(
      http.post('*/v1/auth/refresh', () => {
        refreshCalls++
        return HttpResponse.json({
          access_token: 'access-2',
          refresh_token: 'refresh-2',
          token_type: 'Bearer',
        })
      }),
      http.get('*/v1/a', ({ request }) =>
        request.headers.get('authorization') === 'Bearer access-2'
          ? HttpResponse.json({ n: 1 })
          : problem(401),
      ),
      http.get('*/v1/b', ({ request }) =>
        request.headers.get('authorization') === 'Bearer access-2'
          ? HttpResponse.json({ n: 2 })
          : problem(401),
      ),
    )
    const [a, b] = await Promise.all([
      request<{ n: number }>('/v1/a'),
      request<{ n: number }>('/v1/b'),
    ])
    expect(a.n).toBe(1)
    expect(b.n).toBe(2)
    expect(refreshCalls).toBe(1)
  })

  it('clears the session and throws unauthorized when refresh fails', async () => {
    server.use(
      http.post('*/v1/auth/refresh', () => problem(401)),
      http.get('*/v1/thing', () => problem(401)),
    )
    await expect(request('/v1/thing')).rejects.toMatchObject({
      kind: 'unauthorized',
    })
    expect(useSession.getState().refreshToken).toBeNull()
  })

  it('maps RFC7807 responses to AppError kinds', async () => {
    server.use(http.patch('*/v1/thing', () => problem(409, 'version conflict')))
    await expect(
      request('/v1/thing', { method: 'PATCH', body: {} }),
    ).rejects.toMatchObject({ kind: 'conflict', status: 409, detail: 'version conflict' })
  })

  it('maps network failures to AppError network kind', async () => {
    server.use(http.get('*/v1/thing', () => HttpResponse.error()))
    await expect(request('/v1/thing')).rejects.toMatchObject({ kind: 'network' })
  })
})
