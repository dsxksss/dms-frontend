import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { FieldDef } from '@/api/registry'
import type { FormValues } from '@/lib/field-types'
import { EntityPicker } from './EntityPicker'

export function SchemaForm({
  projectId,
  fields,
  values,
  errors,
  onChange,
}: {
  projectId: string
  fields: FieldDef[]
  values: FormValues
  errors: Record<string, string>
  onChange: (name: string, value: unknown) => void
}) {
  const { t } = useTranslation('registry')
  const v = (n: string) => (values[n] ?? '') as string

  return (
    <div className="space-y-4">
      {fields.map((f) => {
        const err = errors[f.name]
        const labelId = `f-${f.name}`
        return (
          <div key={f.name} className="space-y-2">
            <Label htmlFor={labelId}>
              {f.name}
              {f.required && <span className="text-destructive"> *</span>}
              {f.sensitive && (
                <span className="text-warning ml-1 text-xs">
                  ({t('fieldBuilder.sensitive')})
                </span>
              )}
            </Label>

            {f.type === 'boolean' ? (
              <div>
                <Switch
                  id={labelId}
                  checked={!!values[f.name]}
                  onCheckedChange={(c) => onChange(f.name, c)}
                />
              </div>
            ) : f.type === 'text' || f.type === 'sequence' ? (
              <Textarea
                id={labelId}
                className="font-mono"
                value={v(f.name)}
                aria-invalid={!!err}
                onChange={(e) => onChange(f.name, e.target.value)}
              />
            ) : f.type === 'enum' ? (
              <Select
                value={v(f.name)}
                onValueChange={(val) => onChange(f.name, val)}
              >
                <SelectTrigger id={labelId} aria-invalid={!!err}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {f.options.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : f.type === 'reference' ? (
              <EntityPicker
                projectId={projectId}
                value={v(f.name) || undefined}
                onChange={(id) => onChange(f.name, id ?? '')}
              />
            ) : (
              <Input
                id={labelId}
                type={
                  f.type === 'integer' || f.type === 'number'
                    ? 'number'
                    : f.type === 'date'
                      ? 'date'
                      : f.type === 'datetime'
                        ? 'datetime-local'
                        : 'text'
                }
                value={v(f.name)}
                aria-invalid={!!err}
                onChange={(e) => onChange(f.name, e.target.value)}
              />
            )}

            {err && <p className="text-destructive text-sm">{t(err)}</p>}
          </div>
        )
      })}
    </div>
  )
}
