import { describe, it, expect } from 'vitest'
import {
  buildData,
  coerce,
  initialValues,
  isHiddenSensitive,
  validateEntity,
} from '@/lib/field-types'
import type { FieldDef } from '@/api/registry'

const f = (over: Partial<FieldDef>): FieldDef => ({
  name: 'x',
  type: 'string',
  required: false,
  unique: false,
  sensitive: false,
  options: [],
  ...over,
})

describe('coerce', () => {
  it('converts numbers, empties to undefined', () => {
    expect(coerce(f({ type: 'integer' }), '42')).toBe(42)
    expect(coerce(f({ type: 'number' }), '3.14')).toBe(3.14)
    expect(coerce(f({ type: 'integer' }), '')).toBeUndefined()
    expect(coerce(f({}), '')).toBeUndefined()
    expect(coerce(f({}), 'hi')).toBe('hi')
  })
  it('booleans always return a boolean', () => {
    expect(coerce(f({ type: 'boolean' }), true)).toBe(true)
    expect(coerce(f({ type: 'boolean' }), false)).toBe(false)
    expect(coerce(f({ type: 'boolean' }), undefined)).toBe(false)
  })
})

describe('validateEntity', () => {
  it('flags required-but-empty', () => {
    expect(validateEntity([f({ name: 'n', required: true })], { n: '' })).toEqual({
      n: 'errors.required',
    })
  })
  it('flags non-numeric number fields', () => {
    expect(
      validateEntity([f({ name: 'm', type: 'number' })], { m: 'abc' }),
    ).toEqual({ m: 'errors.number' })
  })
  it('passes valid input and never flags false booleans', () => {
    expect(validateEntity([f({ name: 'n', required: true })], { n: 'ok' })).toEqual(
      {},
    )
    expect(
      validateEntity([f({ name: 'b', type: 'boolean', required: true })], {
        b: false,
      }),
    ).toEqual({})
  })
})

describe('buildData', () => {
  it('omits empty optionals, keeps booleans, converts numbers', () => {
    const fields = [
      f({ name: 'n' }),
      f({ name: 'opt' }),
      f({ name: 'b', type: 'boolean' }),
      f({ name: 'mw', type: 'number' }),
    ]
    expect(buildData(fields, { n: 'x', opt: '', b: false, mw: '1.5' })).toEqual({
      n: 'x',
      b: false,
      mw: 1.5,
    })
  })
})

describe('initialValues', () => {
  it('maps entity data (booleans→bool, others→string)', () => {
    const fields = [
      f({ name: 'n' }),
      f({ name: 'b', type: 'boolean' }),
      f({ name: 'mw', type: 'number' }),
    ]
    expect(initialValues(fields, { n: 'a', b: true, mw: 2 })).toEqual({
      n: 'a',
      b: true,
      mw: '2',
    })
  })
  it('produces defaults without data', () => {
    expect(
      initialValues([f({ name: 'n' }), f({ name: 'b', type: 'boolean' })]),
    ).toEqual({ n: '', b: false })
  })
})

describe('isHiddenSensitive', () => {
  it('is true only for sensitive fields absent from data', () => {
    expect(isHiddenSensitive(f({ name: 's', sensitive: true }), {})).toBe(true)
    expect(
      isHiddenSensitive(f({ name: 's', sensitive: true }), { s: 'v' }),
    ).toBe(false)
    expect(isHiddenSensitive(f({ name: 's' }), {})).toBe(false)
  })
})
