import { useQuery } from '@tanstack/react-query'
import { searchApi } from '@/api/search'

/** 全局搜索：`q` < 2 字符或未启用时不发请求；短缓存避免抖动。 */
export function useSearch(q: string, enabled = true) {
  const term = q.trim()
  return useQuery({
    queryKey: ['search', term],
    queryFn: () => searchApi.global(term),
    enabled: enabled && term.length >= 2,
    staleTime: 10_000,
  })
}
