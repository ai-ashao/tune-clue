import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: /browser-viewport\.spec\.ts/,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: 'http://127.0.0.1:4174',
    ...devices['Desktop Chrome'],
    headless: true,
  },
  webServer: {
    command:
      'VITE_SITE_URL=http://127.0.0.1:4174 pnpm exec vite --host 127.0.0.1 --port 4174 --strictPort',
    url: 'http://127.0.0.1:4174/api/health',
    reuseExistingServer: false,
  },
})
