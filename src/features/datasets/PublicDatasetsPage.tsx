import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Database } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/page-header'
import { GridHeader, GridRow, TableCard, Th } from '@/components/data-grid'
import { EmptyState, ErrorState, TableSkeleton } from '@/components/states'
import { cn } from '@/lib/utils'
import {
  usePublicDatasets,
  usePublicDatasetTags,
} from '@/hooks/use-public-datasets'

const COLS = '1.8fr 1fr 150px'

/** 公共（系统）数据集：跨企业全局只读，由平台超管发布。 */
export function PublicDatasetsPage() {
  const { t } = useTranslation('common')
  const { t: td } = useTranslation('datasets')
  const [tag, setTag] = useState<string | undefined>(undefined)
  const query = usePublicDatasets(tag)
  const tags = usePublicDatasetTags()
  const data = query.data ?? []

  return (
    <div className="mx-auto max-w-[1000px] px-8 py-7">
      <PageHeader
        title={t('nav.publicDatasets')}
        titleEn="Public datasets"
        description={t('app.tagline')}
        size="md"
      />

      {(tags.data?.length ?? 0) > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setTag(undefined)}
            className={cn(
              'rounded-full border px-2.5 py-1 text-[12px] font-semibold transition',
              !tag
                ? 'border-brand bg-accent text-brand'
                : 'border-transparent bg-[#F0F2F6] text-muted-foreground hover:text-foreground',
            )}
          >
            {td('filter.allTags')}
          </button>
          {tags.data!.map((tg) => (
            <button
              key={tg}
              type="button"
              onClick={() => setTag(tg)}
              className={cn(
                'rounded-full border px-2.5 py-1 text-[12px] font-semibold transition',
                tag === tg
                  ? 'border-brand bg-accent text-brand'
                  : 'border-transparent bg-[#F0F2F6] text-muted-foreground hover:text-foreground',
              )}
            >
              {tg}
            </button>
          ))}
        </div>
      )}

      {query.isLoading ? (
        <TableSkeleton rows={4} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : data.length === 0 ? (
        <EmptyState title={t('table.empty')} />
      ) : (
        <TableCard>
          <GridHeader cols={COLS}>
            <Th>{t('settings.displayName', { defaultValue: '名称' })}</Th>
            <Th>{td('meta.tags')}</Th>
            <Th>{t('nav.publicDatasets')}</Th>
          </GridHeader>
          {data.map((d) => (
            <GridRow key={d.id} cols={COLS}>
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-[#EFE9FB] text-[#6D5BD0]">
                  <Database className="size-4" />
                </div>
                <div className="min-w-0">
                  <div className="truncate font-bold">{d.name}</div>
                  {d.description && (
                    <div className="truncate text-[11.5px] text-muted-foreground">
                      {d.description}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {d.tags.slice(0, 3).map((tg) => (
                  <Badge key={tg} variant="info">
                    {tg}
                  </Badge>
                ))}
              </div>
              <div>
                <Badge variant="success">
                  {t('readonly', { defaultValue: '全企业只读' })}
                </Badge>
              </div>
            </GridRow>
          ))}
        </TableCard>
      )}
    </div>
  )
}
