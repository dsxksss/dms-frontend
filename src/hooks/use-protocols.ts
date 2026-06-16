import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  protocolsApi,
  type LinkTarget,
  type ProtocolStep,
  type RunResults,
  type RunStatus,
} from '@/api/protocols'

const root = (projectId: string) => ['protocols', projectId] as const

export const protocolKeys = {
  protocols: (pid: string, params: unknown) =>
    [...root(pid), 'protocols', params] as const,
  protocol: (pid: string, id: string) => [...root(pid), 'protocol', id] as const,
  runs: (pid: string, params: unknown) => [...root(pid), 'runs', params] as const,
  run: (pid: string, id: string) => [...root(pid), 'run', id] as const,
  links: (pid: string, rid: string) => [...root(pid), 'links', rid] as const,
}

function useInvalidate(projectId: string) {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: root(projectId) })
}

export function useProtocols(
  projectId: string,
  params: { include_archived?: boolean; limit?: number; offset?: number },
) {
  return useQuery({
    queryKey: protocolKeys.protocols(projectId, params),
    queryFn: () => protocolsApi.list(projectId, params),
  })
}

export function useCreateProtocol(projectId: string) {
  const invalidate = useInvalidate(projectId)
  return useMutation({
    mutationFn: (body: {
      key: string
      name: string
      description?: string
      steps: ProtocolStep[]
    }) => protocolsApi.create(projectId, body),
    onSuccess: invalidate,
  })
}

export function useUpdateProtocol(projectId: string, pid: string) {
  const invalidate = useInvalidate(projectId)
  return useMutation({
    mutationFn: (body: {
      name?: string
      description?: string
      steps?: ProtocolStep[]
      version: number
    }) => protocolsApi.update(projectId, pid, body),
    onSuccess: invalidate,
  })
}

export function useDeleteProtocol(projectId: string) {
  const invalidate = useInvalidate(projectId)
  return useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) =>
      protocolsApi.remove(projectId, id, version),
    onSuccess: invalidate,
  })
}

export function useSetProtocolArchived(projectId: string) {
  const invalidate = useInvalidate(projectId)
  return useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) =>
      protocolsApi.setArchived(projectId, id, archived),
    onSuccess: invalidate,
  })
}

export function useStartRun(projectId: string) {
  const invalidate = useInvalidate(projectId)
  return useMutation({
    mutationFn: ({ pid, name }: { pid: string; name: string }) =>
      protocolsApi.startRun(projectId, pid, { name }),
    onSuccess: invalidate,
  })
}

export function useRuns(
  projectId: string,
  params: { protocol?: string; status?: string; limit?: number; offset?: number },
) {
  return useQuery({
    queryKey: protocolKeys.runs(projectId, params),
    queryFn: () => protocolsApi.listRuns(projectId, params),
  })
}

export function useRun(projectId: string, rid: string, enabled = true) {
  return useQuery({
    queryKey: protocolKeys.run(projectId, rid),
    queryFn: () => protocolsApi.getRun(projectId, rid),
    enabled: enabled && !!rid,
  })
}

export function useDeleteRun(projectId: string) {
  const invalidate = useInvalidate(projectId)
  return useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) =>
      protocolsApi.deleteRun(projectId, id, version),
    onSuccess: invalidate,
  })
}

export function useUpdateResults(projectId: string, rid: string) {
  const invalidate = useInvalidate(projectId)
  return useMutation({
    mutationFn: (body: { results: RunResults; version: number }) =>
      protocolsApi.updateResults(projectId, rid, body),
    onSuccess: invalidate,
  })
}

export function useSetRunStatus(projectId: string, rid: string) {
  const invalidate = useInvalidate(projectId)
  return useMutation({
    mutationFn: (body: { status: RunStatus; version: number }) =>
      protocolsApi.setStatus(projectId, rid, body),
    onSuccess: invalidate,
  })
}

export function useRunLinks(projectId: string, rid: string, enabled = true) {
  return useQuery({
    queryKey: protocolKeys.links(projectId, rid),
    queryFn: () => protocolsApi.listLinks(projectId, rid),
    enabled: enabled && !!rid,
  })
}

export function useAddRunLink(projectId: string, rid: string) {
  const invalidate = useInvalidate(projectId)
  return useMutation({
    mutationFn: (body: { target_kind: LinkTarget; target_id: string; kind?: string }) =>
      protocolsApi.addLink(projectId, rid, body),
    onSuccess: invalidate,
  })
}

export function useDeleteRunLink(projectId: string, rid: string) {
  const invalidate = useInvalidate(projectId)
  return useMutation({
    mutationFn: (linkId: string) => protocolsApi.deleteLink(projectId, rid, linkId),
    onSuccess: invalidate,
  })
}
