import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { orgsApi } from '@/api/orgs'

// 资源展示顺序；动作按 查看(read) → 管理(write) 排。
const RESOURCE_ORDER = ['project', 'dataset', 'org', 'user', 'audit']
const ACTION_ORDER = ['read', 'write']

export function MyPermissionsCard() {
  const { t } = useTranslation('orgs')
  const query = useQuery({
    queryKey: ['my-permissions'],
    queryFn: () => orgsApi.myPermissions({}),
  })

  // 把 "resource:action" 列表按资源归组，便于用人话展示。
  const groups = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const p of query.data?.permissions ?? []) {
      const [res, act] = p.split(':')
      if (!map.has(res)) map.set(res, new Set())
      if (act) map.get(res)!.add(act)
    }
    const ordered = [
      ...RESOURCE_ORDER.filter((r) => map.has(r)),
      ...[...map.keys()].filter((r) => !RESOURCE_ORDER.includes(r)),
    ]
    return ordered.map((res) => ({
      res,
      actions: [...(map.get(res) ?? [])].sort(
        (a, b) => ACTION_ORDER.indexOf(a) - ACTION_ORDER.indexOf(b),
      ),
    }))
  }, [query.data])

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="text-base">{t('permissions.title')}</CardTitle>
        <p className="text-muted-foreground text-sm">{t('permissions.desc')}</p>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <Skeleton className="h-6 w-full" />
        ) : groups.length > 0 ? (
          <ul className="divide-y">
            {groups.map(({ res, actions }) => (
              <li
                key={res}
                className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
              >
                <span className="text-sm font-medium">
                  {t(`permissions.resources.${res}`, res)}
                </span>
                <div className="flex flex-wrap justify-end gap-1.5">
                  {actions.map((act) => (
                    <Badge key={act} variant="secondary" className="gap-1 font-normal">
                      <Check className="size-3" />
                      {t(`permissions.actions.${act}`, act)}
                    </Badge>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">{t('permissions.empty')}</p>
        )}
      </CardContent>
    </Card>
  )
}
