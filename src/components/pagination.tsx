import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export const DEFAULT_PAGE_LIMIT = 12
export const DEFAULT_PAGE_SIZE_OPTIONS = [12, 24, 48] as const

/** 分页条（原型 上一页 / 页码 / 下一页）。单页时不渲染。 */
export function Pagination({
  limit,
  offset,
  total,
  onChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
}: {
  limit: number
  offset: number
  total: number
  onChange: (p: { limit: number; offset: number }) => void
  pageSizeOptions?: readonly number[]
}) {
  const { t } = useTranslation('common')
  const safeLimit = pageSizeOptions.includes(limit) ? limit : DEFAULT_PAGE_LIMIT
  const pages = Math.max(1, Math.ceil(total / safeLimit))
  const page = Math.min(pages, Math.max(1, Math.floor(offset / safeLimit) + 1))
  const minPageSize = Math.min(...pageSizeOptions)
  if (pages <= 1 && total <= minPageSize) return null

  const go = (p: number) =>
    onChange({
      limit: safeLimit,
      offset: Math.max(0, (Math.min(pages, Math.max(1, p)) - 1) * safeLimit),
    })

  const changeLimit = (nextLimit: string) => {
    onChange({ limit: Number(nextLimit), offset: 0 })
  }

  // 当前页附近的窗口（最多 5 个页码）
  const start = Math.max(1, Math.min(page - 2, pages - 4))
  const nums = Array.from({ length: Math.min(5, pages) }, (_, i) => start + i)

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {pageSizeOptions.length > 1 && (
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground text-[12px]">
            {t('table.rowsPerPage')}
          </span>
          <Select value={String(safeLimit)} onValueChange={changeLimit}>
            <SelectTrigger className="h-8 w-[74px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => go(page - 1)}
      >
        {t('table.prev')}
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
        {t('table.next')}
      </Button>
    </div>
  )
}
