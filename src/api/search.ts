import { request } from '@/api/client'

/** 后端 /v1/search 一条结果。kind 决定图标与跳转目标。 */
export interface SearchHit {
  kind:
    | 'project'
    | 'organization'
    | 'dataset'
    | 'asset'
    | 'data'
    | 'file'
    | 'notebook'
    | 'protocol'
  id: string
  project_id?: string
  title: string
  subtitle?: string
}

export const searchApi = {
  /** 全局内容搜索（跨可见项目；后端已按授权过滤）。 */
  global: (q: string) =>
    request<SearchHit[]>('/v1/search', { query: { q } }),
}
