import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { AppProviders } from '@/app/providers'
import App from '@/App'

// 冒烟测试：验证设计系统 + i18n + providers 能渲染（不与具体语言耦合）。
describe('App', () => {
  it('renders heading and CTA', () => {
    render(
      <AppProviders>
        <App />
      </AppProviders>,
    )
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})
