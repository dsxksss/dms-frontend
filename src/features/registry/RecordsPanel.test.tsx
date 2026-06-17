import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import i18n from '@/i18n/i18n'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/utils'
import { RecordsPanel } from '@/features/registry/EntitiesPanel'

const ASSET_TYPE = {
  id: 'at1',
  scope: 'project',
  scope_id: 'p1',
  kind: 'asset',
  key: 'compound',
  name: 'Compound',
  fields: [
    { name: 'mw', type: 'number', required: false, unique: false, sensitive: false, options: [] },
  ],
  version: 1,
}

function handlers() {
  return [
    http.get('*/v1/projects/p1/members', () =>
      HttpResponse.json([{ user_id: 'u-1', role: 'manager' }]),
    ),
    http.get('*/v1/projects/p1/asset-types', () => HttpResponse.json([ASSET_TYPE])),
    http.get('*/v1/projects/p1/data-templates', () => HttpResponse.json([])),
    http.get('*/v1/projects/p1/assets', () =>
      HttpResponse.json({
        items: [{ id: 'a1', project_id: 'p1', type_id: 'at1', data: { mw: '180' }, version: 1 }],
        total: 1,
        limit: 20,
        offset: 0,
      }),
    ),
  ]
}

beforeEach(async () => {
  await i18n.changeLanguage('zh-CN')
})

describe('RecordsPanel (assets)', () => {
  it('lists asset records of the selected type', async () => {
    server.use(...handlers())
    renderWithProviders(<RecordsPanel projectId="p1" kind="asset" />)
    expect(await screen.findByText('180')).toBeInTheDocument()
  })

  it('shows the create action for a contributor+', async () => {
    server.use(...handlers())
    renderWithProviders(<RecordsPanel projectId="p1" kind="asset" />)
    await screen.findByText('180')
    expect(screen.getByRole('button', { name: '新建记录' })).toBeInTheDocument()
  })
})
