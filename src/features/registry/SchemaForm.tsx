import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { fieldDisplayName } from '@/api/registry'
import type { FieldDef } from '@/api/registry'
import { EntityPicker } from './EntityPicker'
import { DateTimePicker } from './DateTimePicker'

/** 按字段定义动态渲染记录表单（新建 / 编辑记录）。 */
export function SchemaForm({
  projectId,
  fields,
  values,
  errors = {},
  onChange,
}: {
  projectId: string
  fields: FieldDef[]
  values: Record<string, unknown>
  errors?: Record<string, string>
  onChange: (name: string, value: unknown) => void
}) {
  const { t, i18n } = useTranslation('registry')

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {fields.map((f) => {
        const v = values[f.name]
        const err = errors[f.name]
        // 长内容 + 引用字段(含类型框/记录下拉/新建钮)占满整行，避免太窄显示不全。
        const wide =
          f.type === 'text' || f.type === 'sequence' || f.type === 'reference'
        return (
          <div
            key={f.name}
            className={cn('space-y-1.5', wide && 'sm:col-span-2')}
          >
            <Label className="flex items-center gap-1.5 text-[12px] text-[#5a6473]">
              {fieldDisplayName(f, i18n.language)}
              {fieldDisplayName(f, i18n.language) !== f.name && (
                <span className="mono text-[10px] font-normal text-muted-foreground">
                  {f.name}
                </span>
              )}
              {f.required && <span className="text-destructive">*</span>}
              {f.sensitive && (
                <span className="text-[10px] font-bold text-[#E0492C]">
                  {t('fieldBuilder.sensitive')}
                </span>
              )}
            </Label>
            <FieldInput
              projectId={projectId}
              field={f}
              value={v}
              onChange={(val) => onChange(f.name, val)}
            />
            {err && <p className="text-[11px] text-destructive">{err}</p>}
          </div>
        )
      })}
    </div>
  )
}

function FieldInput({
  projectId,
  field,
  value,
  onChange,
}: {
  projectId: string
  field: FieldDef
  value: unknown
  onChange: (v: unknown) => void
}) {
  const { t } = useTranslation('registry')
  const str = value == null ? '' : String(value)

  switch (field.type) {
    case 'text':
      return (
        <Textarea
          rows={3}
          value={str}
          onChange={(e) => onChange(e.target.value)}
        />
      )
    case 'sequence':
      return (
        <Textarea
          rows={3}
          className="mono text-[12px]"
          value={str}
          onChange={(e) => onChange(e.target.value)}
        />
      )
    case 'integer':
    case 'number':
      return (
        <div className="flex">
          <Input
            type="number"
            value={str}
            className={cn(field.unit_symbol && 'rounded-r-none')}
            onChange={(e) =>
              onChange(e.target.value === '' ? null : Number(e.target.value))
            }
          />
          {field.unit_symbol && (
            <span className="flex h-9 shrink-0 items-center rounded-r-md border border-l-0 bg-surface-1 px-2.5 text-[12px] font-medium text-muted-foreground">
              {field.unit_symbol}
            </span>
          )}
        </div>
      )
    case 'boolean':
      return (
        <div className="flex h-9 items-center">
          <Switch
            checked={Boolean(value)}
            onCheckedChange={(c) => onChange(c)}
          />
          <span className="ml-2 text-[12.5px] text-muted-foreground">
            {value ? t('form.true') : t('form.false')}
          </span>
        </div>
      )
    case 'date':
      return (
        <DateTimePicker value={str} mode="date" onChange={onChange} />
      )
    case 'datetime':
      return (
        <DateTimePicker value={str} mode="datetime" onChange={onChange} />
      )
    case 'enum':
      return (
        <Select value={str} onValueChange={(val) => onChange(val)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    case 'reference':
      return (
        <EntityPicker
          projectId={projectId}
          value={str || null}
          onChange={(id) => onChange(id)}
          refType={field.ref_type ?? undefined}
        />
      )
    case 'structure':
      return (
        <Input
          value={str}
          placeholder={t('fieldType.structure')}
          onChange={(e) => onChange(e.target.value)}
        />
      )
    default:
      return <Input value={str} onChange={(e) => onChange(e.target.value)} />
  }
}
