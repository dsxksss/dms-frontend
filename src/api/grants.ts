import { request } from '@/api/client'

/** 细粒度授权的资源类型与动作（与后端 resource_grants 对齐）。 */
export type GrantResourceType =
  | 'project'
  | 'asset_type'
  | 'template_type'
  | 'dataset'
export type GrantAction = 'read' | 'create' | 'update' | 'delete' | 'manage'

export const GRANT_ACTIONS: GrantAction[] = [
  'read',
  'create',
  'update',
  'delete',
  'manage',
]

export interface ResourceGrant {
  id: string
  resource_type: GrantResourceType
  resource_id: string
  user_id: string
  action: GrantAction
}

export interface GrantBody {
  resource_type: GrantResourceType
  resource_id: string
  user_id: string
  action: GrantAction
}

/** 统一授权端点：叠加放行（角色 OR grant）；授权者须为资源所属项目 Manager。 */
export const grantsApi = {
  list: (resourceType: GrantResourceType, resourceId: string) =>
    request<ResourceGrant[]>('/v1/grants', {
      query: { resource_type: resourceType, resource_id: resourceId },
    }),
  create: (body: GrantBody) =>
    request<ResourceGrant>('/v1/grants', { method: 'POST', body }),
  remove: (body: GrantBody) =>
    request<void>('/v1/grants', {
      method: 'DELETE',
      query: { ...body },
      responseType: 'void',
    }),
}
