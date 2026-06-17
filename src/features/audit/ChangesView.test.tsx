import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n from '@/i18n/i18n'
import { ChangesView } from '@/features/audit/ChangesView'

function renderView(changes: unknown) {
  return render(
    <I18nextProvider i18n={i18n}>
      <ChangesView changes={changes} />
    </I18nextProvider>,
  )
}

beforeEach(async () => {
  await i18n.changeLanguage('zh-CN')
})

describe('ChangesView', () => {
  it('renders field-level before → after rows', () => {
    renderView({ name: { old: '旧名', new: '新名' }, status: { new: 'active' } })
    expect(screen.getByText('name')).toBeInTheDocument()
    expect(screen.getByText('旧名')).toBeInTheDocument()
    expect(screen.getByText('新名')).toBeInTheDocument()
    // 仅有 new 的字段：变更前显示占位
    expect(screen.getByText('status')).toBeInTheDocument()
    expect(screen.getByText('active')).toBeInTheDocument()
  })

  it('shows an empty message when there are no changes', () => {
    renderView({})
    expect(screen.getByText('无变更详情')).toBeInTheDocument()
  })

  it('degrades gracefully for non-object changes', () => {
    renderView(null)
    expect(screen.getByText('无变更详情')).toBeInTheDocument()
  })
})
