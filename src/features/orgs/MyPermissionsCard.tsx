import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { orgsApi } from '@/api/orgs'

export function MyPermissionsCard() {
  const { t } = useTranslation('orgs')
  const query = useQuery({
    queryKey: ['my-permissions'],
    queryFn: () => orgsApi.myPermissions({}),
  })

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="text-base">{t('permissions.title')}</CardTitle>
        <p className="text-muted-foreground text-sm">{t('permissions.desc')}</p>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <Skeleton className="h-6 w-full" />
        ) : query.data && query.data.permissions.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {query.data.permissions.map((p) => (
              <Badge key={p} variant="secondary" className="font-mono text-xs">
                {p}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">{t('permissions.empty')}</p>
        )}
      </CardContent>
    </Card>
  )
}
