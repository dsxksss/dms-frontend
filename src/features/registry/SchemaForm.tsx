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
import type { FieldDef } from '@/api/registry'
import { EntityPicker } from './EntityPicker'

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
  const { t } = useTranslation('registry')

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {fields.map((f) => {
        const v = values[f.name]
        const err = errors[f.name]
        const wide = f.type === 'text' || f.type === 'sequence'
        return (
          <div
            key={f.name}
            className={cn('space-y-1.5', wide && 'sm:col-span-2')}
          >
            <Label className="flex items-center gap-1.5 text-[12px] text-[#5a6473]">
              {f.name}
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
        <Input
          type="number"
          value={str}
          onChange={(e) =>
            onChange(e.target.value === '' ? null : Number(e.target.value))
          }
        />
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
        <Input type="date" value={str} onChange={(e) => onChange(e.target.value)} />
      )
    case 'datetime':
      return (
        <Input
          type="datetime-local"
          value={str}
          onChange={(e) => onChange(e.target.value)}
        />
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
