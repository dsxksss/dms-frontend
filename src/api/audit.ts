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
