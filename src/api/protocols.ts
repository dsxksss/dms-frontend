import { request } from '@/api/client'
import type { Paginated } from '@/api/types'
import type { FieldDef } from '@/api/registry'

/** 方案步骤；fields 复用 Registry 的 FieldDef。 */
export interface ProtocolStep {
  name: string
  description: string
  fields: FieldDef[]
}

export interface Protocol {
  id: string
  project_id: string
  key: string
  name: string
  description: string
  steps: ProtocolStep[]
  archived: boolean
  version: number
}

export type RunStatus = 'draft' | 'in_progress' | 'completed' | 'aborted'

/** Run 结果：按 步骤名 → 字段名 → 值 组织（前端约定，后端存为不透明 JSONB）。 */
export type RunResults = Record<string, Record<string, unknown>>

export interface Run {
  id: string
  project_id: string
  protocol_id: string
  protocol_version: number
  name: string
  status: RunStatus
  steps: ProtocolStep[]
  results: RunResults
  performed_by: string | null
  started_at: string | null
  completed_at: string | null
  version: number
}

export type LinkTarget = 'entity' | 'dataset' | 'file'

export interface RunLink {
  id: string
  run_id: string
  target_kind: LinkTarget
  target_id: string
  kind: string
}

const base = (projectId: string) => `/v1/projects/${projectId}`

export const protocolsApi = {
  list: (
    projectId: string,
    params: { include_archived?: boolean; limit?: number; offset?: number } = {},
  ) =>
    request<Paginated<Protocol>>(`${base(projectId)}/protocols`, {
      query: { ...params },
    }),
  get: (projectId: string, pid: string) =>
    request<Protocol>(`${base(projectId)}/protocols/${pid}`),
  create: (
    projectId: string,
    body: { key: string; name: string; description?: string; steps: ProtocolStep[] },
  ) =>
    request<Protocol>(`${base(projectId)}/protocols`, { method: 'POST', body }),
  update: (
    projectId: string,
    pid: string,
    body: {
      name?: string
      description?: string
      steps?: ProtocolStep[]
      version: number
    },
  ) =>
    request<Protocol>(`${base(projectId)}/protocols/${pid}`, {
      method: 'PATCH',
      body,
    }),
  remove: (projectId: string, pid: string, version: number) =>
    request<void>(`${base(projectId)}/protocols/${pid}`, {
      method: 'DELETE',
      query: { version },
      responseType: 'void',
    }),
  setArchived: (projectId: string, pid: string, archived: boolean) =>
    request<Protocol>(
      `${base(projectId)}/protocols/${pid}/${archived ? 'archive' : 'unarchive'}`,
      { method: 'POST' },
    ),

  startRun: (projectId: string, pid: string, body: { name: string }) =>
    request<Run>(`${base(projectId)}/protocols/${pid}/runs`, {
      method: 'POST',
      body,
    }),
  listRuns: (
    projectId: string,
    params: { protocol?: string; status?: string; limit?: number; offset?: number } = {},
  ) =>
    request<Paginated<Run>>(`${base(projectId)}/runs`, { query: { ...params } }),
  getRun: (projectId: string, rid: string) =>
    request<Run>(`${base(projectId)}/runs/${rid}`),
  deleteRun: (projectId: string, rid: string, version: number) =>
    request<void>(`${base(projectId)}/runs/${rid}`, {
      method: 'DELETE',
      query: { version },
      responseType: 'void',
    }),
  updateResults: (
    projectId: string,
    rid: string,
    body: { results: RunResults; version: number },
  ) =>
    request<Run>(`${base(projectId)}/runs/${rid}/results`, {
      method: 'PATCH',
      body,
    }),
  setStatus: (
    projectId: string,
    rid: string,
    body: { status: RunStatus; version: number },
  ) =>
    request<Run>(`${base(projectId)}/runs/${rid}/status`, {
      method: 'POST',
      body,
    }),

  listLinks: (projectId: string, rid: string) =>
    request<RunLink[]>(`${base(projectId)}/runs/${rid}/links`),
  addLink: (
    projectId: string,
    rid: string,
    body: { target_kind: LinkTarget; target_id: string; kind?: string },
  ) =>
    request<RunLink>(`${base(projectId)}/runs/${rid}/links`, {
      method: 'POST',
      body,
    }),
  deleteLink: (projectId: string, rid: string, linkId: string) =>
    request<void>(`${base(projectId)}/runs/${rid}/links/${linkId}`, {
      method: 'DELETE',
      responseType: 'void',
    }),
}
