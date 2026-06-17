import type { ProblemDetails } from '@/api/types'

export type ErrorKind =
  | 'network'
  | 'unauthorized'
  | 'forbidden'
  | 'notFound'
  | 'conflict'
  | 'validation'
  | 'server'
  | 'unknown'

/** 统一前端错误：由 HTTP 状态 + RFC7807 体归类，便于 UI 分类处理与 i18n。 */
export class AppError extends Error {
  readonly kind: ErrorKind
  readonly status: number
  readonly detail?: string
  readonly problem?: ProblemDetails

  constructor(
    kind: ErrorKind,
    status: number,
    message: string,
    opts?: { detail?: string; problem?: ProblemDetails },
  ) {
    super(message)
    this.name = 'AppError'
    this.kind = kind
    this.status = status
    this.detail = opts?.detail
    this.problem = opts?.problem
  }
}

export function kindFromStatus(status: number): ErrorKind {
  switch (status) {
    case 401:
      return 'unauthorized'
    case 403:
      return 'forbidden'
    case 404:
      return 'notFound'
    case 409:
      return 'conflict'
    case 422:
      return 'validation'
    default:
      return status >= 500 ? 'server' : 'unknown'
  }
}

/** i18n key（common 命名空间下的 error.*）。 */
export function errorI18nKey(e: unknown): string {
  if (e instanceof AppError) return `error.${e.kind}`
  return 'error.unknown'
}

/** 优先用后端 detail（如校验信息），否则回退到归类的通用文案 key。 */
export function isAppError(e: unknown): e is AppError {
  return e instanceof AppError
}

/**
 * 配额类 409 → 友好文案 key（common 命名空间）。非配额返回 null。
 * 匹配后端 quota.rs 的 detail：organization (member) limit reached / storage quota exceeded / upgrade plan。
 */
export function quotaI18nKey(e: unknown): string | null {
  if (!(e instanceof AppError) || e.status !== 409) return null
  const d = (e.detail ?? '').toLowerCase()
  if (!/limit reached|quota exceeded|upgrade plan/.test(d)) return null
  if (d.includes('member')) return 'error.quota.users'
  if (d.includes('storage')) return 'error.quota.storage'
  if (d.includes('organization')) return 'error.quota.orgs'
  return 'error.quota.generic'
}
