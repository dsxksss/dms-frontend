import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { AuditEntry } from '@/api/audit'

type Pair = { before: unknown; after: unknown }

/** 把 changes 解析成 字段 → {前, 后}。兼容 [from,to] / {before,after} / {from,to}。 */
function parseChanges(changes: unknown): Record<string, Pair> | null {
  if (!changes || typeof changes !== 'object') return null
  const obj = changes as Record<string, unknown>
  const out: Record<string, Pair> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (Array.isArray(v) && v.length === 2) out[k] = { before: v[0], after: v[1] }
    else if (v && typeof v === 'object') {
      const r = v as Record<string, unknown>
      if ('before' in r || 'after' in r) out[k] = { before: r.before, after: r.after }
      else if ('from' in r || 'to' in r) out[k] = { before: r.from, after: r.to }
      else out[k] = { before: undefined, after: v }
    } else out[k] = { before: undefined, after: v }
  }
  return Object.keys(out).length ? out : null
}

const fmt = (v: unknown) =>
  v === undefined || v === null
    ? '—'
    : typeof v === 'object'
      ? JSON.stringify(v)
      : String(v)

export function ChangesView({ entry }: { entry: AuditEntry }) {
  const { t } = useTranslation('audit')
  const [open, setOpen] = useState(false)
  const parsed = parseChanges(entry.changes)
  if (!parsed) return null

  return (
    <>
      <button
        type="button"
        className="font-semibold text-brand"
        onClick={() => setOpen(true)}
      >
        {t('viewChanges')}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{t('changesTitle')}</DialogTitle>
          </DialogHeader>
          <div className="overflow-hidden rounded-[11px] border">
            <div className="grid grid-cols-[1fr_1.2fr_1.2fr] border-b bg-surface-2 px-3 py-2">
              <span className="th">{t('changes.field')}</span>
              <span className="th">{t('changes.before')}</span>
              <span className="th">{t('changes.after')}</span>
            </div>
            {Object.entries(parsed).map(([field, pair]) => (
              <div
                key={field}
                className="grid grid-cols-[1fr_1.2fr_1.2fr] items-start gap-2 border-b border-divider px-3 py-2 text-[12.5px] last:border-b-0"
              >
                <span className="font-semibold">{field}</span>
                <span className="mono break-all text-muted-foreground line-through decoration-[#d4948a]/60">
                  {fmt(pair.before)}
                </span>
                <span className="mono break-all">{fmt(pair.after)}</span>
              </div>
            ))}
          </div>
          <details className="text-[12px] text-muted-foreground">
            <summary className="cursor-pointer">{t('changes.raw')}</summary>
            <pre className="mono mt-2 max-h-60 overflow-auto rounded-md bg-surface-2 p-3 text-[11px]">
              {JSON.stringify(entry.changes, null, 2)}
            </pre>
          </details>
        </DialogContent>
      </Dialog>
    </>
  )
}
