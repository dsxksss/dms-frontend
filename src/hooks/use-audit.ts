import { useQuery } from '@tanstack/react-query'
import { auditApi, type AuditParams } from '@/api/audit'

export function useAudit(params: AuditParams) {
  return useQuery({
    queryKey: ['audit', params],
    queryFn: () => auditApi.list(params),
  })
}

export function useProjectAudit(
  projectId: string,
  params: Omit<AuditParams, 'project_id'>,
  enabled = true,
) {
  return useQuery({
    queryKey: ['audit', 'project', projectId, params],
    queryFn: () => auditApi.listProject(projectId, params),
    enabled: enabled && !!projectId,
  })
}
