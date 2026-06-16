import { defineConfig, devices } from '@playwright/test'

/**
 * E2E 烟测打 live 前后端：
 *   1) 起后端 :8080（见 README/本仓库说明），2) `npm run dev`（:5173，proxy 到 8080），
 *   3) `npm run e2e`。Playwright 会复用已起的 dev server。
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
