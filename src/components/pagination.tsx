import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

/** 分页条（原型 上一页 / 页码 / 下一页）。单页时不渲染。 */
export function Pagination({
  limit,
  offset,
  total,
  onChange,
}: {
  limit: number
  offset: number
  total: number
  onChange: (p: { limit: number; offset: number }) => void
}) {
  const { t } = useTranslation('common')
  const pages = Math.max(1, Math.ceil(total / limit))
  const page = Math.floor(offset / limit) + 1
  if (pages <= 1) return null

  const go = (p: number) =>
    onChange({ limit, offset: Math.max(0, (p - 1) * limit) })

  // 当前页附近的窗口（最多 5 个页码）
  const start = Math.max(1, Math.min(page - 2, pages - 4))
  const nums = Array.from({ length: Math.min(5, pages) }, (_, i) => start + i)

  return (
    <div className="flex items-center gap-1.5">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => go(page - 1)}
      >
        {t('pagination.prev', { defaultValue: '上一页' })}
      </Button>
      {nums.map((n) => (
        <Button
          key={n}
          variant={n === page ? 'default' : 'outline'}
          size="sm"
          className="min-w-8"
          onClick={() => go(n)}
        >
          {n}
        </Button>
      ))}
      <Button
        variant="outline"
        size="sm"
        disabled={page >= pages}
        onClick={() => go(page + 1)}
      >
        {t('pagination.next', { defaultValue: '下一页' })}
      </Button>
    </div>
  )
}
