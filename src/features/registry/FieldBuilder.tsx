import { useTranslation } from 'react-i18next'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
        <span className="text-sm font-medium">{t('fieldBuilder.title')}</span>
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="size-4" />
          {t('fieldBuilder.add')}
        </Button>
      </div>

      {value.length === 0 ? (
        <p className="text-muted-foreground rounded-md border border-dashed px-3 py-6 text-center text-sm">
          {t('fieldBuilder.empty')}
        </p>
      ) : (
        <div className="space-y-2">
          {value.map((f, i) => (
            <div key={i} className="rounded-md border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  className="w-40"
                  placeholder={t('fieldBuilder.name')}
                  value={f.name}
                  onChange={(e) => update(i, { name: e.target.value })}
                />
                <Select
                  value={f.type}
                  onValueChange={(v) => update(i, { type: v as FieldType })}
                >
                  <SelectTrigger size="sm" className="w-36">
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

                <label className="flex items-center gap-1.5 text-sm">
                  <Checkbox
                    checked={f.required}
                    onCheckedChange={(c) => update(i, { required: !!c })}
                  />
                  {t('fieldBuilder.required')}
                </label>
                <label className="flex items-center gap-1.5 text-sm">
                  <Checkbox
                    checked={f.unique}
                    onCheckedChange={(c) => update(i, { unique: !!c })}
                  />
                  {t('fieldBuilder.unique')}
                </label>
                <label className="flex items-center gap-1.5 text-sm">
                  <Checkbox
                    checked={f.sensitive}
                    onCheckedChange={(c) => update(i, { sensitive: !!c })}
                  />
                  {t('fieldBuilder.sensitive')}
                </label>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="ml-auto size-8"
                  onClick={() => remove(i)}
                >
                  <Trash2 className="text-destructive size-4" />
                </Button>
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
