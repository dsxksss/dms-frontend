import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { signaturesApi, type SignBody } from '@/api/signatures'

const root = (projectId: string) => ['signatures', projectId] as const

export function useSignatures(
  projectId: string,
  params: {
    target_kind?: string
    target_id?: string
    limit?: number
    offset?: number
  } = {},
  enabled = true,
) {
  return useQuery({
    queryKey: [...root(projectId), params],
    queryFn: () => signaturesApi.list(projectId, params),
    enabled,
  })
}

export function useSign(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: SignBody) => signaturesApi.sign(projectId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: root(projectId) }),
  })
}
