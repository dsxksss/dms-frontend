import { useTranslation } from 'react-i18next'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FieldBuilder } from '@/features/registry/FieldBuilder'
import type { ProtocolStep } from '@/api/protocols'
import type { FieldDefInput } from '@/api/registry'

const emptyStep = (): ProtocolStep => ({ name: '', description: '', fields: [] })

export function StepBuilder({
  value,
  onChange,
}: {
  value: ProtocolStep[]
  onChange: (steps: ProtocolStep[]) => void
}) {
  const { t } = useTranslation('protocols')

  const update = (i: number, patch: Partial<ProtocolStep>) =>
    onChange(value.map((s, idx) => (idx === i ? { ...s, ...patch } : s)))
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i))
  const add = () => onChange([...value, emptyStep()])

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{t('steps.title')}</span>
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="size-4" />
          {t('steps.add')}
        </Button>
      </div>

      {value.length === 0 ? (
        <p className="text-muted-foreground rounded-md border border-dashed px-3 py-6 text-center text-sm">
          {t('steps.empty')}
        </p>
      ) : (
        <div className="space-y-3">
          {value.map((s, i) => (
            <div key={i} className="space-y-3 rounded-md border p-3">
              <div className="flex items-start gap-2">
                <span className="bg-muted mt-1 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium tabular-nums">
                  {i + 1}
                </span>
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder={t('steps.namePlaceholder')}
                    value={s.name}
                    onChange={(e) => update(i, { name: e.target.value })}
                  />
                  <Input
                    placeholder={t('steps.description')}
                    value={s.description}
                    onChange={(e) => update(i, { description: e.target.value })}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => remove(i)}
                >
                  <Trash2 className="text-destructive size-4" />
                </Button>
              </div>
              <div className="border-t pt-3">
                <FieldBuilder
                  value={s.fields as FieldDefInput[]}
                  onChange={(fields) => update(i, { fields })}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
