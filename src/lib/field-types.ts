import type { FieldDef, FieldType } from '@/api/registry'

export const FIELD_TYPES: FieldType[] = [
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

export type FormValues = Record<string, unknown>

/** 表单原始值 → 类型化 JSON 值；空值返回 undefined（布尔除外）。 */
export function coerce(field: FieldDef, raw: unknown): unknown {
  if (field.type === 'boolean') return Boolean(raw)
  if (raw === undefined || raw === null || raw === '') return undefined
  if (field.type === 'integer') {
    const n = Number(raw)
    return Number.isNaN(n) ? raw : Math.trunc(n)
  }
  if (field.type === 'number') {
    const n = Number(raw)
    return Number.isNaN(n) ? raw : n
  }
  return String(raw)
}

/** 校验：返回 { 字段名: 错误 key }。错误 key 在 registry 命名空间。 */
export function validateEntity(
  fields: FieldDef[],
  values: FormValues,
): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const f of fields) {
    const raw = values[f.name]
    const empty = raw === undefined || raw === null || raw === ''
    if (f.required && f.type !== 'boolean' && empty) {
      errors[f.name] = 'errors.required'
      continue
    }
    if ((f.type === 'integer' || f.type === 'number') && !empty) {
      if (Number.isNaN(Number(raw))) errors[f.name] = 'errors.number'
    }
  }
  return errors
}

/** 组装提交用的 data 对象（省略空的可选字段；布尔恒为布尔）。 */
export function buildData(
  fields: FieldDef[],
  values: FormValues,
): Record<string, unknown> {
  const data: Record<string, unknown> = {}
  for (const f of fields) {
    if (f.type === 'boolean') {
      data[f.name] = Boolean(values[f.name])
      continue
    }
    const v = coerce(f, values[f.name])
    if (v !== undefined) data[f.name] = v
  }
  return data
}

/** 由实体（编辑）或默认值生成表单初始值。 */
export function initialValues(fields: FieldDef[], data?: Record<string, unknown>): FormValues {
  const v: FormValues = {}
  for (const f of fields) {
    const cur = data?.[f.name]
    if (f.type === 'boolean') v[f.name] = cur === true
    else v[f.name] = cur === undefined || cur === null ? '' : String(cur)
  }
  return v
}

/** 敏感字段被后端隐藏：字段标 sensitive 且 data 中不存在该键。 */
export function isHiddenSensitive(
  field: FieldDef,
  data: Record<string, unknown>,
): boolean {
  return field.sensitive && !(field.name in data)
}
