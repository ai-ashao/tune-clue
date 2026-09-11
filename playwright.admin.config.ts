import { defineConfig } from '@playwright/test'

const origin = process.env.ADMIN_E2E_ORIGIN || 'http://localhost:3000'
const parsed = new URL(origin)
if (!['localhost', '127.0.0.1'].includes(parsed.hostname))
  throw new Error('Admin E2E is restricted to a local test origin.')
export default defineConfig({
  testDir: './tests/admin-browser',
  testMatch: '**/*.pw.ts',
  fullyParallel: false,
  workers: 1,
  use: { baseURL: origin, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: {
    command: 'pnpm dev --port 3000',
    url: origin,
    reuseExistingServer: true,
    timeout: 120000,
  },
})
