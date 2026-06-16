import { useSession } from '@/auth/session'
import { AppError, kindFromStatus } from '@/lib/errors'
import type { ProblemDetails, SessionTokens } from '@/api/types'

const BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

export type QueryParams = Record<
  string,
  string | number | boolean | undefined | null
>

export interface RequestOptions {
  method?: string
  /** JSON body（自动 stringify 并设 content-type）。 */
  body?: unknown
  /** 原始 body（文件上传等），与 body 互斥；需自行在 headers 设 content-type。 */
  raw?: BodyInit
  query?: QueryParams
  headers?: Record<string, string>
  signal?: AbortSignal
  /** 跳过 401 自动刷新（用于登录/登出/刷新自身）。 */
  skipAuthRefresh?: boolean
  responseType?: 'json' | 'blob' | 'void'
}

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
  const { tenant, refreshToken } = useSession.getState()
  if (!tenant || !refreshToken) return false
  let res: Response
  try {
    res = await fetch(buildUrl('/v1/auth/refresh'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tenant, refresh_token: refreshToken }),
    })
  } catch {
    return false
  }
  if (!res.ok) {
    useSession.getState().clear()
    return false
  }
  const tokens = (await res.json()) as SessionTokens
  useSession.getState().setTokens(tokens.access_token, tokens.refresh_token)
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
  return new AppError(kind, res.status, message, { detail: problem?.detail, problem })
}

function applyAuthHeader(headers: Headers) {
  const token = useSession.getState().accessToken
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

/** 发起请求；网络异常归一为 AppError('network')。 */
export async function request<T>(
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  let res: Response
  try {
    res = await doFetch(path, opts)
  } catch {
    throw new AppError('network', 0, 'Network error')
  }

  // access 过期 → 单飞刷新 → 重放一次
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
    if (res.status === 401) useSession.getState().clear()
    throw await toAppError(res)
  }

  const responseType = opts.responseType ?? 'json'
  if (responseType === 'void' || res.status === 204) return undefined as T
  if (responseType === 'blob') return (await res.blob()) as T
  return (await res.json()) as T
}

/** 下载二进制并触发浏览器保存（datasets export / files content）。 */
export async function download(
  path: string,
  fallbackName: string,
  opts: RequestOptions = {},
): Promise<void> {
  const headers = new Headers(opts.headers)
  applyAuthHeader(headers)
  let res = await fetch(buildUrl(path, opts.query), { headers })
  if (res.status === 401 && !opts.skipAuthRefresh && (await ensureRefreshed())) {
    const h2 = new Headers(opts.headers)
    applyAuthHeader(h2)
    res = await fetch(buildUrl(path, opts.query), { headers: h2 })
  }
  if (!res.ok) throw await toAppError(res)

  const disposition = res.headers.get('content-disposition') ?? ''
  const match = /filename="?([^"]+)"?/.exec(disposition)
  const name = match?.[1] ?? fallbackName

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
