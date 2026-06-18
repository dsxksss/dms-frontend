import { useTranslation } from 'react-i18next'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SCALAR_FIELD_TYPES, type FieldDef, type FieldType } from '@/api/registry'
import type { ProtocolStep } from '@/api/protocols'

/** 结果字段缺省（步骤结果只用标量；其余标志位填默认值）。 */
function newField(): FieldDef {
  return {
    name: '',
    type: 'string',
    required: false,
    unique: false,
    sensitive: false,
    options: [],
  }
}

function newStep(): ProtocolStep {
  return { name: '', description: '', fields: [] }
}

/** 方案步骤编辑器：增删步骤；每步含名称 + 若干结果字段（名/类型）。 */
export function StepBuilder({
  value,
  onChange,
}: {
  value: ProtocolStep[]
  onChange: (steps: ProtocolStep[]) => void
}) {
  const { t } = useTranslation('protocols')

  const patchStep = (i: number, patch: Partial<ProtocolStep>) =>
    onChange(value.map((s, idx) => (idx === i ? { ...s, ...patch } : s)))

  const patchField = (si: number, fi: number, patch: Partial<FieldDef>) =>
    patchStep(si, {
      fields: value[si].fields.map((f, idx) =>
        idx === fi ? { ...f, ...patch } : f,
      ),
    })

  return (
    <div className="space-y-3">
      {value.length === 0 && (
        <p className="rounded-lg border border-dashed border-divider px-3 py-4 text-center text-[12px] text-muted-foreground">
          {t('steps.empty')}
        </p>
      )}

      {value.map((step, si) => (
        <div
          key={si}
          className="rounded-[11px] border border-divider bg-surface-2 p-3"
        >
          <div className="flex items-center gap-2">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-[12px] font-bold text-brand">
              {si + 1}
            </span>
            <Input
              className="h-8 bg-card"
              placeholder={t('steps.namePlaceholder')}
              value={step.name}
              onChange={(e) => patchStep(si, { name: e.target.value })}
            />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onChange(value.filter((_, idx) => idx !== si))}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>

          <div className="mt-2.5 space-y-2 pl-8">
            {step.fields.map((f, fi) => (
              <div key={fi} className="flex items-center gap-2">
                <Input
                  className="h-8 bg-card"
                  placeholder={t('steps.name')}
                  value={f.name}
                  onChange={(e) => patchField(si, fi, { name: e.target.value })}
                />
                <Select
                  value={f.type}
                  onValueChange={(val) =>
                    patchField(si, fi, { type: val as FieldType })
                  }
                >
                  <SelectTrigger size="sm" className="h-8 w-[124px] bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCALAR_FIELD_TYPES.map((ft) => (
                      <SelectItem key={ft} value={ft}>
                        {ft}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() =>
                    patchStep(si, {
                      fields: step.fields.filter((_, idx) => idx !== fi),
                    })
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="xs"
              onClick={() =>
                patchStep(si, { fields: [...step.fields, newField()] })
              }
            >
              <Plus className="size-3" />
              {t('steps.add')}
            </Button>
          </div>
        </div>
      ))}

      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange([...value, newStep()])}
      >
        <Plus className="size-3.5" />
        {t('steps.add')}
      </Button>
    </div>
  )
}
