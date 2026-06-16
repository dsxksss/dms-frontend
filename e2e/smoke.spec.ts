import { test, expect, type Page } from '@playwright/test'

const TENANT = process.env.E2E_TENANT ?? 'acme'
const EMAIL = process.env.E2E_EMAIL ?? 'admin@acme.test'
const PASSWORD = process.env.E2E_PASSWORD ?? 'Passw0rd!'

// 固定界面语言为 zh-CN，使文本选择器稳定。
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('dms-lang', 'zh-CN'))
})

async function login(page: Page) {
  await page.goto('/login')
  await page.locator('#tenant').fill(TENANT)
  await page.locator('#email').fill(EMAIL)
  await page.locator('#password').fill(PASSWORD)
  await page.locator('button[type=submit]').click()
}

test('rejects invalid credentials', async ({ page }) => {
  await page.goto('/login')
  await page.locator('#tenant').fill(TENANT)
  await page.locator('#email').fill(EMAIL)
  await page.locator('#password').fill('wrong-password')
  await page.locator('button[type=submit]').click()
  await expect(page.getByText('租户、邮箱或密码不正确')).toBeVisible()
})

test('logs in and lands on projects', async ({ page }) => {
  await login(page)
  await expect(page).toHaveURL(/\/projects/)
  await expect(page.getByRole('heading', { name: '项目' })).toBeVisible()
})

test('creates a project end-to-end', async ({ page }) => {
  await login(page)
  await expect(page).toHaveURL(/\/projects/)

  const name = `e2e-${Date.now()}`
  await page.getByRole('button', { name: '新建项目' }).first().click()
  await page.getByLabel('名称').fill(name)
  await page.getByRole('button', { name: '创建' }).click()

  await expect(page.getByText(name)).toBeVisible()
})

test('shows datasets and audit in the nav', async ({ page }) => {
  await login(page)
  await expect(page.getByRole('link', { name: '数据集' })).toBeVisible()
  await page.getByRole('link', { name: '数据集' }).click()
  await expect(page).toHaveURL(/\/datasets/)
  await expect(page.getByRole('heading', { name: '数据集' })).toBeVisible()
})
