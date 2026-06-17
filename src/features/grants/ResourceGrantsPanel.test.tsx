import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import i18n from '@/i18n/i18n'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/utils'
import { ResourceGrantsPanel } from '@/features/grants/ResourceGrantsPanel'

beforeEach(async () => {
  await i18n.changeLanguage('zh-CN')
})

describe('ResourceGrantsPanel', () => {
  it('lists existing grants with the action label', async () => {
    server.use(
      http.get('*/v1/grants', () =>
        HttpResponse.json([
          {
            id: 'g1',
            resource_type: 'dataset',
            resource_id: 'd1',
            user_id: 'u-9',
            action: 'read',
          },
        ]),
      ),
    )
    renderWithProviders(
      <ResourceGrantsPanel resourceType="dataset" resourceId="d1" />,
    )
    // 动作徽章用人话「查看」展示
    expect(await screen.findByText('查看')).toBeInTheDocument()
  })

  it('shows an empty hint when there are no grants', async () => {
    server.use(http.get('*/v1/grants', () => HttpResponse.json([])))
    renderWithProviders(
      <ResourceGrantsPanel resourceType="project" resourceId="p1" />,
    )
    expect(await screen.findByText('暂无单独授权')).toBeInTheDocument()
  })
})
