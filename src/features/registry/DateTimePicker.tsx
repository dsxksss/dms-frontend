import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarDays, ChevronLeft, ChevronRight, Clock, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

type PickerMode = 'date' | 'datetime'

export function DateTimePicker({
  value,
  mode,
  onChange,
}: {
  value: string
  mode: PickerMode
  onChange: (value: string) => void
}) {
  const { t, i18n } = useTranslation('registry')
  const selected = parsePickerValue(value)
  const today = new Date()
  const initial = selected ?? today
  const [viewYear, setViewYear] = useState(initial.getFullYear())
  const [viewMonth, setViewMonth] = useState(initial.getMonth())
  const [hour, setHour] = useState(pad2(selected?.getHours() ?? today.getHours()))
  const [minute, setMinute] = useState(pad2(selected?.getMinutes() ?? 0))

  useEffect(() => {
    const next = parsePickerValue(value)
    if (!next) return
    setViewYear(next.getFullYear())
    setViewMonth(next.getMonth())
    setHour(pad2(next.getHours()))
    setMinute(pad2(next.getMinutes()))
  }, [value])

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language, {
        year: 'numeric',
        month: 'long',
      }).format(new Date(viewYear, viewMonth, 1)),
    [i18n.language, viewMonth, viewYear],
  )
  const weekdays = useMemo(() => weekLabels(i18n.language), [i18n.language])
  const cells = useMemo(() => calendarCells(viewYear, viewMonth), [viewMonth, viewYear])

  const pickDate = (date: Date) => {
    const next = new Date(date)
    next.setHours(Number(hour), Number(minute), 0, 0)
    onChange(formatPickerValue(next, mode))
  }

  const jumpMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1)
    setViewYear(next.getFullYear())
    setViewMonth(next.getMonth())
  }

  const setToday = () => {
    const next = new Date()
    next.setHours(Number(hour), Number(minute), 0, 0)
    setViewYear(next.getFullYear())
    setViewMonth(next.getMonth())
    onChange(formatPickerValue(next, mode))
  }

  const setNow = () => {
    const next = new Date()
    setHour(pad2(next.getHours()))
    setMinute(pad2(next.getMinutes()))
    setViewYear(next.getFullYear())
    setViewMonth(next.getMonth())
    onChange(formatPickerValue(next, mode))
  }

  const onTimeChange = (part: 'hour' | 'minute', nextValue: string) => {
    const nextHour = part === 'hour' ? nextValue : hour
    const nextMinute = part === 'minute' ? nextValue : minute
    setHour(nextHour)
    setMinute(nextMinute)
    if (selected) {
      const next = new Date(selected)
      next.setHours(Number(nextHour), Number(nextMinute), 0, 0)
      onChange(formatPickerValue(next, mode))
    }
  }

  return (
    <div className="flex min-w-0 gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              'h-9 min-w-0 flex-1 justify-start px-3 text-left font-medium',
              !value && 'text-muted-foreground',
            )}
          >
            {mode === 'datetime' ? (
              <Clock className="size-4" />
            ) : (
              <CalendarDays className="size-4" />
            )}
            <span className="min-w-0 truncate">
              {value ? formatDisplay(value, mode, i18n.language) : t('datePicker.placeholder')}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[316px] p-3">
          <div className="flex items-center justify-between gap-2">
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => jumpMonth(-1)}>
              <ChevronLeft className="size-4" />
            </Button>
            <div className="text-[13px] font-bold">{monthLabel}</div>
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => jumpMonth(1)}>
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-muted-foreground">
            {weekdays.map((day) => (
              <div key={day} className="h-6 leading-6">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, index) =>
              cell ? (
                <button
                  key={cell.toISOString()}
                  type="button"
                  className={cn(
                    'flex size-9 items-center justify-center rounded-md text-[12.5px] font-semibold transition hover:bg-accent hover:text-brand',
                    isSameDate(cell, today) && 'border border-brand/30 text-brand',
                    selected && isSameDate(cell, selected) && 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
                  )}
                  onClick={() => pickDate(cell)}
                >
                  {cell.getDate()}
                </button>
              ) : (
                <div key={`blank-${index}`} className="size-9" />
              ),
            )}
          </div>

          {mode === 'datetime' && (
            <div className="mt-3 grid grid-cols-[1fr_1fr] gap-2 border-t pt-3">
              <div className="space-y-1">
                <div className="text-[11px] font-bold text-muted-foreground">
                  {t('datePicker.hour')}
                </div>
                <Select value={hour} onValueChange={(v) => onTimeChange('hour', v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {range(24).map((n) => (
                      <SelectItem key={n} value={pad2(n)}>
                        {pad2(n)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <div className="text-[11px] font-bold text-muted-foreground">
                  {t('datePicker.minute')}
                </div>
                <Select value={minute} onValueChange={(v) => onTimeChange('minute', v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {range(60).map((n) => (
                      <SelectItem key={n} value={pad2(n)}>
                        {pad2(n)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="mt-3 flex justify-between gap-2 border-t pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={mode === 'datetime' ? setNow : setToday}
            >
              {mode === 'datetime' ? t('datePicker.now') : t('datePicker.today')}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange('')}>
              {t('datePicker.clear')}
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {value && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          title={t('datePicker.clear')}
          onClick={() => onChange('')}
        >
          <X className="size-4" />
        </Button>
      )}
    </div>
  )
}

function calendarCells(year: number, month: number) {
  const first = new Date(year, month, 1)
  const days = new Date(year, month + 1, 0).getDate()
  const blanks = first.getDay()
  const cells: Array<Date | null> = Array.from({ length: blanks }, () => null)
  for (let day = 1; day <= days; day += 1) {
    cells.push(new Date(year, month, day))
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function parsePickerValue(value: string) {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/)
  if (!m) return null
  const year = Number(m[1])
  const month = Number(m[2]) - 1
  const day = Number(m[3])
  const hour = Number(m[4] ?? '0')
  const minute = Number(m[5] ?? '0')
  return new Date(year, month, day, hour, minute, 0, 0)
}

function formatPickerValue(date: Date, mode: PickerMode) {
  const day = `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
  if (mode === 'date') return day
  return `${day}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

function formatDisplay(value: string, mode: PickerMode, locale: string) {
  const date = parsePickerValue(value)
  if (!date) return value
  const opts: Intl.DateTimeFormatOptions =
    mode === 'date'
      ? { year: 'numeric', month: '2-digit', day: '2-digit' }
      : {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }
  return new Intl.DateTimeFormat(locale, opts).format(date)
}

function weekLabels(locale: string) {
  const base = new Date(2024, 0, 7)
  return range(7).map((offset) =>
    new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(
      new Date(base.getFullYear(), base.getMonth(), base.getDate() + offset),
    ),
  )
}

function isSameDate(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function range(n: number) {
  return Array.from({ length: n }, (_, i) => i)
}

function pad2(n: number) {
  return String(n).padStart(2, '0')
}
