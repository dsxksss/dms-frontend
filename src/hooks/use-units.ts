import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { unitsApi, type UnitInput } from '@/api/units'

const root = (projectId: string) => ['units', projectId] as const

export const unitKeys = {
  list: (projectId: string) => root(projectId),
}

export function useUnits(projectId: string, category?: string) {
  return useQuery({
    queryKey: [...unitKeys.list(projectId), category ?? 'all'],
    queryFn: () => unitsApi.list(projectId, category),
    enabled: !!projectId,
  })
}

function useInvalidateUnits(projectId: string) {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: unitKeys.list(projectId) })
}

export function useCreateUnit(projectId: string) {
  const invalidate = useInvalidateUnits(projectId)
  return useMutation({
    mutationFn: (body: UnitInput) => unitsApi.create(projectId, body),
    onSuccess: invalidate,
  })
}

export function useUpdateUnit(projectId: string) {
  const invalidate = useInvalidateUnits(projectId)
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<UnitInput> }) =>
      unitsApi.update(projectId, id, body),
    onSuccess: invalidate,
  })
}

export function useDeleteUnit(projectId: string) {
  const invalidate = useInvalidateUnits(projectId)
  return useMutation({
    mutationFn: (id: string) => unitsApi.delete(projectId, id),
    onSuccess: invalidate,
  })
}
