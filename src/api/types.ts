/**
 * 通用 API 契约：镜像后端 RFC7807 错误体、分页包装、认证 DTO。
 * 各资源（projects/registry/dataset/files/audit/orgs）的类型在对应 api 文件中补充，
 * 以便与后端 *Response 结构逐一核对。source of truth = ../dms-backend/docs/api.md。
 */

export interface ProblemDetails {
  type: string
  title: string
  status: number
  detail?: string
}

export interface Paginated<T> {
  items: T[]
  total: number
  limit: number
  offset: number
}

export interface PageQuery {
  limit?: number
  offset?: number
}

export interface SessionTokens {
  access_token: string
  refresh_token: string
  token_type: string
  /** access token 有效秒数（后端返回，当前前端用 401 刷新策略，未强依赖）。 */
  expires_in?: number
}

export interface LoginRequest {
  /** 可选：留空时后端按 Host 子域名推断租户。 */
  tenant?: string
  email: string
  password: string
}

/** GET /v1/me */
export interface Me {
  user_id: string | null
  tenant_id: string
  permissions: string[]
}
