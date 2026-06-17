import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { problem } from '@/test/msw/handlers'
import { platformRequest } from '@/platform/client'
import { usePlatformSession } from '@/platform/session'

beforeEach(() => {
  usePlatformSession.getState().setSession({
    accessToken: 'expired',
    refreshToken: 'prefresh-1',
  })
})

describe('platform client', () => {
  it('attaches the Bearer token and returns parsed JSON', async () => {
    server.use(
      http.get('*/v1/platform/thing', ({ request }) => {
        expect(request.headers.get('authorization')).toBe('Bearer expired')
        return HttpResponse.json({ ok: true })
      }),
    )
    const data = await platformRequest<{ ok: boolean }>('/v1/platform/thing')
    expect(data.ok).toBe(true)
  })

  it('on 401 refreshes via the platform refresh endpoint and replays', async () => {
    let refreshCalls = 0
    server.use(
      http.post('*/v1/platform/auth/refresh', () => {
        refreshCalls++
        return HttpResponse.json({
          access_token: 'paccess-2',
          refresh_token: 'prefresh-2',
          token_type: 'Bearer',
        })
      }),
      http.get('*/v1/platform/thing', ({ request }) =>
        request.headers.get('authorization') === 'Bearer paccess-2'
          ? HttpResponse.json({ ok: true })
          : problem(401),
      ),
    )
    const data = await platformRequest<{ ok: boolean }>('/v1/platform/thing')
    expect(data.ok).toBe(true)
    expect(refreshCalls).toBe(1)
    expect(usePlatformSession.getState().accessToken).toBe('paccess-2')
    expect(usePlatformSession.getState().refreshToken).toBe('prefresh-2')
  })

  it('clears the platform session and throws unauthorized when refresh fails', async () => {
    server.use(
      http.post('*/v1/platform/auth/refresh', () => problem(401)),
      http.get('*/v1/platform/thing', () => problem(401)),
    )
    await expect(platformRequest('/v1/platform/thing')).rejects.toMatchObject({
      kind: 'unauthorized',
    })
    expect(usePlatformSession.getState().refreshToken).toBeNull()
  })

  it('maps a 403 (non platform admin) to AppError forbidden', async () => {
    server.use(
      http.get('*/v1/platform/me', () => problem(403, 'not a platform admin')),
    )
    await expect(platformRequest('/v1/platform/me')).rejects.toMatchObject({
      kind: 'forbidden',
      status: 403,
    })
  })
})
