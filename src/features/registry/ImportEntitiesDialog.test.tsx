import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '@/i18n/i18n'
import { renderWithProviders } from '@/test/utils'
import { ImportEntitiesDialog } from '@/features/registry/ImportEntitiesDialog'
import type { EntityType } from '@/api/registry'

const type: EntityType = {
  id: 't1',
  scope: 'project',
  scope_id: 'p1',
  key: 'compound',
  name: 'Compound',
  fields: [],
  version: 1,
}

beforeEach(async () => {
  await i18n.changeLanguage('zh-CN')
})

describe('ImportEntitiesDialog', () => {
  it('warns when importing empty content', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <ImportEntitiesDialog
        projectId="p1"
        type={type}
        open
        onOpenChange={() => {}}
      />,
    )
    await user.click(screen.getByRole('button', { name: '导入' }))
    expect(await screen.findByText('请粘贴内容或选择文件')).toBeInTheDocument()
  })
})
