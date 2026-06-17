import { usePlatformSession } from '@/platform/session'
import { AppError, kindFromStatus } from '@/lib/errors'
import type { ProblemDetails, SessionTokens } from '@/api/types'
import type { QueryParams, RequestOptions } from '@/api/client'

/**
 * 平台超管专用请求封装。与 api/client 同构，但：
 * - 注入平台 access token（usePlatformSession，而非租户 useSession）；
 * - 401 静默刷新打到 /v1/platform/auth/refresh（租户走 /v1/auth/refresh）。
 * 两套鉴权完全隔离：平台 401 不会触发租户刷新，反之亦然。
 */
const BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

function buildUrl(path: string, query?: QueryParams): string {
  let url = `${BASE}${path}`
  if (query) {
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) qs.append(k, String(v))
    }
    const s = qs.toString()
    if (s) url += `?${s}`
  }
  return url
}

// ---- 单飞刷新：并发 401 只触发一次 refresh ----
let refreshPromise: Promise<boolean> | null = null

function ensureRefreshed(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = rawRefresh().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

async function rawRefresh(): Promise<boolean> {
  const { refreshToken } = usePlatformSession.getState()
  if (!refreshToken) return false
  let res: Response
  try {
    res = await fetch(buildUrl('/v1/platform/auth/refresh'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
  } catch {
    return false
  }
  if (!res.ok) {
    usePlatformSession.getState().clear()
    return false
  }
  const tokens = (await res.json()) as SessionTokens
  usePlatformSession
    .getState()
    .setTokens(tokens.access_token, tokens.refresh_token)
  return true
}

async function toAppError(res: Response): Promise<AppError> {
  let problem: ProblemDetails | undefined
  try {
    problem = (await res.json()) as ProblemDetails
  } catch {
    problem = undefined
  }
  const kind = kindFromStatus(res.status)
  const message = problem?.detail ?? problem?.title ?? res.statusText
  return new AppError(kind, res.status, message, {
    detail: problem?.detail,
    problem,
  })
}

function applyAuthHeader(headers: Headers) {
  const token = usePlatformSession.getState().accessToken
  if (token && !headers.has('authorization')) {
    headers.set('authorization', `Bearer ${token}`)
  }
}

async function doFetch(path: string, opts: RequestOptions): Promise<Response> {
  const headers = new Headers(opts.headers)
  if (opts.body !== undefined && !headers.has('content-type')) {
    headers.set('content-type', 'application/json')
  }
  applyAuthHeader(headers)

  const init: RequestInit = {
    method: opts.method ?? 'GET',
    headers,
    signal: opts.signal,
  }
  if (opts.raw !== undefined) init.body = opts.raw
  else if (opts.body !== undefined) init.body = JSON.stringify(opts.body)

  return fetch(buildUrl(path, opts.query), init)
}

/** 发起平台请求；网络异常归一为 AppError('network')。 */
export async function platformRequest<T>(
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  let res: Response
  try {
    res = await doFetch(path, opts)
  } catch {
    throw new AppError('network', 0, 'Network error')
  }

  if (res.status === 401 && !opts.skipAuthRefresh) {
    const ok = await ensureRefreshed()
    if (ok) {
      try {
        res = await doFetch(path, opts)
      } catch {
        throw new AppError('network', 0, 'Network error')
      }
    }
  }

  if (!res.ok) {
    if (res.status === 401) usePlatformSession.getState().clear()
    throw await toAppError(res)
  }

  const responseType = opts.responseType ?? 'json'
  if (responseType === 'void' || res.status === 204) return undefined as T
  if (responseType === 'blob') return (await res.blob()) as T
  return (await res.json()) as T
}
