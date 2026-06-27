import { request } from '@/api/client'
import type { Paginated } from '@/api/types'

export interface AuditEntry {
  id: string
  occurred_at: string
  actor_id: string | null
  user_name: string | null
  user_handle: string | null
  ip_address: string | null
  action: string
  event_description: string | null
  entity_type: string
  entity_id: string
  changes: unknown
  request_id: string | null
  parent_type: string | null
  parent_id: string | null
  /** 合规字段（FR-AUDIT）：User-Agent 头、会话跟踪（预留，常 null）。 */
  user_agent: string | null
  session_id: string | null
  /** 结果（当前后端恒 success，失败审计后续补）。 */
  result: 'success' | 'failure'
  /** 防篡改哈希链：hash=sha256(本条 ‖ prev_hash)，prev_hash=同租户上一条。 */
  prev_hash: string | null
  hash: string | null
}

export interface AuditParams {
  entity_type?: string
  entity_id?: string
  actor_id?: string
  limit?: number
  offset?: number
}

export const auditApi = {
  list: (params: AuditParams = {}) =>
    request<Paginated<AuditEntry>>('/v1/audit', { query: { ...params } }),
}
