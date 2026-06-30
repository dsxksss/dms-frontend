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
import { InfoHint } from '@/components/info-hint'
import type { FieldDefInput, FieldType } from '@/api/registry'
import type { Unit } from '@/api/units'

const ALL_TYPES: FieldType[] = [
  'string',
  'text',
  'integer',
  'number',
  'boolean',
  'date',
  'datetime',
  'enum',
  'sequence',
  'structure',
  'reference',
]

const emptyField = (): FieldDefInput => ({
  name: '',
  zh_label: '',
  en_label: '',
  type: 'string',
  required: false,
  unique: false,
  sensitive: false,
  options: [],
})

const NO_UNIT = '__no_unit__'
const NAME_GRID = 'grid-cols-[1fr_1fr_1fr_30px]'
const CONTROL_GRID = 'grid-cols-[0.9fr_1fr_52px_52px_52px]'

/** Schema builder 字段编辑器：开关网格（必填/唯一/敏感），敏感开关为红色。 */
export function FieldBuilder({
  value,
  onChange,
  allowedTypes = ALL_TYPES,
  assetTypes = [],
  units = [],
}: {
  value: FieldDefInput[]
  onChange: (fields: FieldDefInput[]) => void
  allowedTypes?: readonly FieldType[]
  /** 可作为 reference 目标的资产类型（供 ref_type 下拉）。 */
  assetTypes?: { key: string; name: string }[]
  /** 租户单位库（供 number/integer 字段选择）。 */
  units?: Unit[]
}) {
  const { t } = useTranslation('registry')

  const update = (i: number, patch: Partial<FieldDefInput>) =>
    onChange(value.map((f, idx) => (idx === i ? { ...f, ...patch } : f)))
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i))
  const add = () => onChange([...value, emptyField()])

  return (
    <div className="space-y-2.5">
      <div className="flex items-center">
        <span className="text-[13px] font-bold">{t('fieldBuilder.title')}</span>
        <span className="ml-2 text-[11.5px] text-muted-foreground">
          {t('subtitle')}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="ml-auto"
          onClick={add}
        >
          <Plus className="size-4" />
          {t('fieldBuilder.add')}
        </Button>
      </div>

      {value.length === 0 ? (
        <p className="rounded-[9px] border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
          {t('fieldBuilder.empty')}
        </p>
      ) : (
        <div className="space-y-2.5">
          <div className={cn('grid gap-2 px-1 text-[11px] font-bold text-muted-foreground', NAME_GRID)}>
            <div>{t('fieldBuilder.zhLabel')}</div>
            <div>{t('fieldBuilder.enLabel')}</div>
            <div>{t('fieldBuilder.name')}</div>
            <div />
          </div>
          <div
            className={cn(
              'grid gap-2 px-1 text-[11px] font-bold text-muted-foreground',
              CONTROL_GRID,
            )}
          >
            <div className="flex items-center gap-1">
              {t('fieldBuilder.type')}
              <InfoHint>{t('fieldBuilder.typeHint')}</InfoHint>
            </div>
            <div className="flex items-center gap-1">
              {t('fieldBuilder.unit')}
              <InfoHint>{t('fieldBuilder.unitHint')}</InfoHint>
            </div>
            <div className="text-center">{t('fieldBuilder.required')}</div>
            <div className="text-center">{t('fieldBuilder.unique')}</div>
            <div className="flex items-center justify-center gap-1">
              {t('fieldBuilder.sensitive')}
              <InfoHint>{t('fieldBuilder.sensitiveHint')}</InfoHint>
            </div>
          </div>
          {value.map((f, i) => (
            <div key={i}>
              <div className={cn('grid items-center gap-2', NAME_GRID)}>
                <Input
                  className="h-9"
                  placeholder={t('fieldBuilder.zhLabel')}
                  value={f.zh_label ?? ''}
                  onChange={(e) => update(i, { zh_label: e.target.value })}
                />
                <Input
                  className="h-9"
                  placeholder={t('fieldBuilder.enLabel')}
                  value={f.en_label ?? ''}
                  onChange={(e) => update(i, { en_label: e.target.value })}
                />
                <Input
                  className="h-9"
                  placeholder={t('fieldBuilder.name')}
                  value={f.name}
                  onChange={(e) => update(i, { name: e.target.value })}
                />
                <button
                  type="button"
                  className="flex size-7 items-center justify-center text-muted-foreground hover:text-destructive"
                  onClick={() => remove(i)}
                  title={t('actions.delete', { ns: 'common', defaultValue: '删除' })}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              <div className={cn('mt-2 grid items-center gap-2', CONTROL_GRID)}>
                <Select
                  value={f.type}
                  onValueChange={(v) =>
                    update(i, {
                      type: v as FieldType,
                      ref_type: v === 'reference' ? f.ref_type : undefined,
                      unit_id:
                        v === 'number' || v === 'integer' ? f.unit_id : undefined,
                      unit_symbol:
                        v === 'number' || v === 'integer'
                          ? f.unit_symbol
                          : undefined,
                    })
                  }
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
                {f.type === 'number' || f.type === 'integer' ? (
                  <Select
                    value={f.unit_id ?? NO_UNIT}
                    onValueChange={(v) => {
                      if (v === NO_UNIT) {
                        update(i, { unit_id: undefined, unit_symbol: undefined })
                        return
                      }
                      const unit = units.find((u) => u.id === v)
                      update(i, {
                        unit_id: v,
                        unit_symbol: unit?.symbol ?? undefined,
                      })
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t('fieldBuilder.noUnit')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_UNIT}>
                        {t('fieldBuilder.noUnit')}
                      </SelectItem>
                      {units.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.symbol} · {u.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="h-9 rounded-md border border-transparent px-3 py-2 text-[12px] text-muted-foreground">
                    —
                  </div>
                )}
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
                    className={cn(
                      f.sensitive && 'data-[state=checked]:bg-[#E0492C]',
                    )}
                    onCheckedChange={(c) => update(i, { sensitive: c })}
                  />
                </div>
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

              {f.type === 'reference' && assetTypes.length > 0 && (
                <div className="mt-2 flex items-center gap-1.5">
                  <Select
                    value={f.ref_type ?? ''}
                    onValueChange={(v) => update(i, { ref_type: v || undefined })}
                  >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('fieldBuilder.refType')} />
                  </SelectTrigger>
                  <SelectContent>
                    {assetTypes.map((at) => (
                      <SelectItem key={at.key} value={at.key}>
                        {at.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                  </Select>
                  <InfoHint>{t('fieldBuilder.refTypeHint')}</InfoHint>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
