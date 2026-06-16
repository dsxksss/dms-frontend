import { useQuery } from '@tanstack/react-query'
import { auditApi, type AuditParams } from '@/api/audit'

export function useAudit(params: AuditParams) {
  return useQuery({
    queryKey: ['audit', params],
    queryFn: () => auditApi.list(params),
  })
}
