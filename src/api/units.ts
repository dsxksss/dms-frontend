import { request } from '@/api/client'

export interface Unit {
  id: string
  key: string
  name: string
  symbol: string
  category: string
  description?: string | null
  is_builtin: boolean
}

export interface UnitInput {
  key: string
  name: string
  symbol: string
  category: string
  description?: string | null
}

const base = (projectId: string) => `/v1/projects/${projectId}/units`

export const unitsApi = {
  list(projectId: string, category?: string) {
    const qs = category ? `?category=${encodeURIComponent(category)}` : ''
    return request<Unit[]>(`${base(projectId)}${qs}`)
  },
  create(projectId: string, body: UnitInput) {
    return request<Unit>(base(projectId), { method: 'POST', body })
  },
  update(projectId: string, unitId: string, body: Partial<UnitInput>) {
    return request<Unit>(`${base(projectId)}/${unitId}`, {
      method: 'PATCH',
      body,
    })
  },
  delete(projectId: string, unitId: string) {
    return request<void>(`${base(projectId)}/${unitId}`, { method: 'DELETE' })
  },
}
