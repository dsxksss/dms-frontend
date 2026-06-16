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
