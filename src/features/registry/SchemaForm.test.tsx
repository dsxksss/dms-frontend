import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '@/i18n/i18n'
import { renderWithProviders } from '@/test/utils'
import { SchemaForm } from '@/features/registry/SchemaForm'
import type { FieldDef } from '@/api/registry'

const f = (o: Partial<FieldDef>): FieldDef => ({
  name: 'x',
  type: 'string',
  required: false,
  unique: false,
  sensitive: false,
  options: [],
  ...o,
})

beforeEach(async () => {
  await i18n.changeLanguage('zh-CN')
})

describe('SchemaForm', () => {
  it('renders an input per field and reports changes', async () => {
    const onChange = vi.fn()
    renderWithProviders(
      <SchemaForm
        projectId="p1"
        fields={[f({ name: 'title' }), f({ name: 'count', type: 'integer' })]}
        values={{ title: '', count: '' }}
        errors={{}}
        onChange={onChange}
      />,
    )
    expect(screen.getByLabelText('title')).toBeInTheDocument()
    expect(screen.getByLabelText('count')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('title'), 'A')
    expect(onChange).toHaveBeenCalledWith('title', 'A')
  })

  it('shows the validation error text below the field', () => {
    renderWithProviders(
      <SchemaForm
        projectId="p1"
        fields={[f({ name: 'title', required: true })]}
        values={{ title: '' }}
        errors={{ title: 'errors.required' }}
        onChange={() => {}}
      />,
    )
    expect(screen.getByText('此字段必填')).toBeInTheDocument()
  })
})
