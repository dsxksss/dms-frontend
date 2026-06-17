import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  grantsApi,
  type GrantBody,
  type GrantResourceType,
} from '@/api/grants'

const key = (rt: GrantResourceType, rid: string) =>
  ['grants', rt, rid] as const

export function useResourceGrants(
  resourceType: GrantResourceType,
  resourceId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: key(resourceType, resourceId),
    queryFn: () => grantsApi.list(resourceType, resourceId),
    enabled: enabled && !!resourceId,
  })
}

export function useGrantResource(
  resourceType: GrantResourceType,
  resourceId: string,
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: GrantBody) => grantsApi.create(body),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: key(resourceType, resourceId) }),
  })
}

export function useRevokeResource(
  resourceType: GrantResourceType,
  resourceId: string,
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: GrantBody) => grantsApi.remove(body),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: key(resourceType, resourceId) }),
  })
}
