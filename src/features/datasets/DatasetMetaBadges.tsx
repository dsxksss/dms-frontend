import { useTranslation } from 'react-i18next'
import { Tag, User } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

/**
 * 数据集元数据展示：作者 + 标签徽标 + 参考文献清单。空字段自动省略。
 */
export function DatasetMetaBadges({
  tags,
  author,
  references,
}: {
  tags?: string[]
  author?: string
  references?: string[]
}) {
  const { t } = useTranslation('datasets')
  const hasTags = (tags?.length ?? 0) > 0
  const hasRefs = (references?.length ?? 0) > 0
  if (!author && !hasTags && !hasRefs) return null

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
        {author && (
          <span className="inline-flex items-center gap-1">
            <User className="size-3.5" />
            {t('meta.author')}: {author}
          </span>
        )}
        {hasTags && (
          <span className="inline-flex flex-wrap items-center gap-1.5">
            <Tag className="size-3.5" />
            {tags!.map((tag) => (
              <Badge key={tag} variant="info">
                {tag}
              </Badge>
            ))}
          </span>
        )}
      </div>
      {hasRefs && (
        <div className="text-[12px] text-muted-foreground">
          <div className="mb-0.5 font-semibold">{t('meta.references')}</div>
          <ul className="list-inside list-disc space-y-0.5">
            {references!.map((ref, i) => (
              <li key={i} className="break-all">
                {ref}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
