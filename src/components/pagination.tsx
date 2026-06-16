import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface PaginationState {
  limit: number
  offset: number
  total: number
}

const PAGE_SIZES = [10, 20, 50, 100]

export function Pagination({
  limit,
  offset,
  total,
  onChange,
}: PaginationState & { onChange: (next: { limit: number; offset: number }) => void }) {
  const { t } = useTranslation()
  const page = Math.floor(offset / limit) + 1
  const pageCount = Math.max(1, Math.ceil(total / limit))
  const canPrev = offset > 0
  const canNext = page < pageCount

  return (
    <div className="text-muted-foreground flex items-center justify-between gap-4 px-2 py-2 text-sm">
      <span className="tabular-nums">{t('table.total', { total })}</span>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span>{t('table.rowsPerPage')}</span>
          <Select
            value={String(limit)}
            onValueChange={(v) => onChange({ limit: Number(v), offset: 0 })}
          >
            <SelectTrigger size="sm" className="w-[4.5rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((s) => (
                <SelectItem key={s} value={String(s)}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="tabular-nums">
          {t('table.page', { page })} / {pageCount}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            disabled={!canPrev}
            onClick={() => onChange({ limit, offset: Math.max(0, offset - limit) })}
            aria-label="prev"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            disabled={!canNext}
            onClick={() => onChange({ limit, offset: offset + limit })}
            aria-label="next"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
