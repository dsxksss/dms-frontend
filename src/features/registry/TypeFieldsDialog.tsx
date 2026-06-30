import { useTranslation } from 'react-i18next'
import { ShieldCheck } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import type { EntityType, FieldDef } from '@/api/registry'

export function TypeFieldsDialog({
  type,
  open,
  onOpenChange,
}: {
  type: EntityType | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation('registry')
  if (!type) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px]">
        <DialogHeader>
          <DialogTitle>{t('types.fieldDialogTitle', { name: type.name })}</DialogTitle>
          <DialogDescription>
            {type.key} · {t('types.fieldCount', { count: type.fields.length })}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-auto rounded-[10px] border">
          <div className="grid grid-cols-[1.2fr_0.9fr_0.8fr_1fr_1.4fr] border-b bg-surface-1 px-3 py-2 text-[11px] font-bold text-muted-foreground">
            <div>{t('fieldBuilder.name')}</div>
            <div>{t('fieldBuilder.type')}</div>
            <div>{t('fieldBuilder.unit')}</div>
            <div>{t('types.fieldRules')}</div>
            <div>{t('types.fieldDetails')}</div>
          </div>
          {type.fields.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              {t('fieldBuilder.empty')}
            </div>
          ) : (
            type.fields.map((field) => (
              <FieldRow key={field.name} field={field} />
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function FieldRow({ field }: { field: FieldDef }) {
  const { t } = useTranslation('registry')
  const detail =
    field.type === 'enum'
      ? field.options.join(', ') || '—'
      : field.type === 'reference'
        ? field.ref_type || '—'
        : '—'

  return (
    <div className="grid grid-cols-[1.2fr_0.9fr_0.8fr_1fr_1.4fr] items-center border-b px-3 py-2.5 text-[12.5px] last:border-b-0">
      <div className="min-w-0">
        <div className="truncate font-semibold">{field.name}</div>
      </div>
      <div>{t(`fieldType.${field.type}`)}</div>
      <div className="mono text-[12px] text-muted-foreground">
        {field.unit_symbol || '—'}
      </div>
      <div className="flex flex-wrap gap-1">
        {field.required && <Badge variant="outline">{t('fieldBuilder.required')}</Badge>}
        {field.unique && <Badge variant="outline">{t('fieldBuilder.unique')}</Badge>}
        {field.sensitive && (
          <Badge variant="danger" className="gap-1">
            <ShieldCheck className="size-3" />
            {t('fieldBuilder.sensitive')}
          </Badge>
        )}
        {!field.required && !field.unique && !field.sensitive && (
          <span className="text-muted-foreground">—</span>
        )}
      </div>
      <div className="truncate text-muted-foreground" title={detail}>
        {detail}
      </div>
    </div>
  )
}
