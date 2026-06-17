import { useTranslation } from 'react-i18next'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** 把任意值渲染成可读文本（对象/数组退化为紧凑 JSON）。 */
function fmt(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

interface Row {
  field: string
  before?: unknown
  after: unknown
  paired: boolean
}

/** 把审计 changes 归一为「字段 / 前 / 后」行。 */
function toRows(changes: unknown): Row[] | null {
  if (!isRecord(changes)) return null
  const entries = Object.entries(changes)
  if (entries.length === 0) return []
  return entries.map(([field, val]) => {
    if (isRecord(val) && ('old' in val || 'new' in val)) {
      return { field, before: val.old, after: val.new, paired: true }
    }
    return { field, after: val, paired: false }
  })
}

/** 审计变更的可读视图：表格化的字段级前后对比，附折叠的原始 JSON。 */
export function ChangesView({ changes }: { changes: unknown }) {
  const { t } = useTranslation('audit')
  const rows = toRows(changes)

  if (!rows || rows.length === 0) {
    return <p className="text-muted-foreground text-sm">{t('changes.none')}</p>
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('changes.field')}</TableHead>
              <TableHead>{t('changes.before')}</TableHead>
              <TableHead>{t('changes.after')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.field} className="hover:bg-transparent">
                <TableCell className="font-medium">{r.field}</TableCell>
                <TableCell className="text-muted-foreground">
                  {r.paired ? fmt(r.before) : '—'}
                </TableCell>
                <TableCell className="tabular-nums">{fmt(r.after)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <details className="text-muted-foreground text-xs">
        <summary className="cursor-pointer select-none">{t('changes.raw')}</summary>
        <pre className="bg-muted mt-2 max-h-[40vh] overflow-auto rounded-md p-3">
          {JSON.stringify(changes, null, 2)}
        </pre>
      </details>
    </div>
  )
}
