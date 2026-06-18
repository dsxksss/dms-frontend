import { useTranslation } from 'react-i18next'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { FIELD_TYPES } from '@/lib/field-types'
import type { FieldDefInput, FieldType } from '@/api/registry'

const emptyField = (): FieldDefInput => ({
  name: '',
  type: 'string',
  required: false,
  unique: false,
  sensitive: false,
  options: [],
})

export function FieldBuilder({
  value,
  onChange,
  allowedTypes = FIELD_TYPES,
}: {
  value: FieldDefInput[]
  onChange: (fields: FieldDefInput[]) => void
  /** 限制可选字段类型（数据模版仅标量，禁 reference/structure）。 */
  allowedTypes?: readonly FieldType[]
}) {
  const { t } = useTranslation('registry')

  const update = (i: number, patch: Partial<FieldDefInput>) =>
    onChange(value.map((f, idx) => (idx === i ? { ...f, ...patch } : f)))
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i))
  const add = () => onChange([...value, emptyField()])

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-bold">{t('fieldBuilder.title')}</span>
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="size-4" />
          {t('fieldBuilder.add')}
        </Button>
      </div>

      {value.length === 0 ? (
        <p className="text-muted-foreground rounded-[9px] border border-dashed px-3 py-6 text-center text-sm">
          {t('fieldBuilder.empty')}
        </p>
      ) : (
        <div className="space-y-2.5">
          <div className="text-muted-foreground grid grid-cols-[1.4fr_1fr_52px_52px_52px_30px] gap-2 px-1 text-[11px] font-bold">
            <div>{t('fieldBuilder.name')}</div>
            <div>{t('fieldBuilder.type')}</div>
            <div className="text-center">{t('fieldBuilder.required')}</div>
            <div className="text-center">{t('fieldBuilder.unique')}</div>
            <div className="text-center">{t('fieldBuilder.sensitive')}</div>
            <div />
          </div>
          {value.map((f, i) => (
            <div key={i}>
              <div className="grid grid-cols-[1.4fr_1fr_52px_52px_52px_30px] items-center gap-2">
                <Input
                  className="h-9"
                  placeholder={t('fieldBuilder.name')}
                  value={f.name}
                  onChange={(e) => update(i, { name: e.target.value })}
                />
                <Select
                  value={f.type}
                  onValueChange={(v) => update(i, { type: v as FieldType })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedTypes.map((ft) => (
                      <SelectItem key={ft} value={ft}>
                        {t(`fieldType.${ft}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex justify-center">
                  <Switch
                    checked={f.required}
                    onCheckedChange={(c) => update(i, { required: c })}
                  />
                </div>
                <div className="flex justify-center">
                  <Switch
                    checked={f.unique}
                    onCheckedChange={(c) => update(i, { unique: c })}
                  />
                </div>
                <div className="flex justify-center">
                  <Switch
                    checked={f.sensitive}
                    className={cn(f.sensitive && 'data-[state=checked]:bg-[#E0492C]')}
                    onCheckedChange={(c) => update(i, { sensitive: c })}
                  />
                </div>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-destructive flex size-7 items-center justify-center"
                  onClick={() => remove(i)}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>

              {f.type === 'enum' && (
                <Input
                  className="mt-2"
                  placeholder={t('fieldBuilder.optionsPlaceholder')}
                  value={f.options.join(',')}
                  onChange={(e) =>
                    update(i, {
                      options: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
