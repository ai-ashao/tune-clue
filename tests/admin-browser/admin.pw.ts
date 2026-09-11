import { expect, test } from '@playwright/test'

const cookie = process.env.ADMIN_E2E_COOKIE
const fixtureAttempt = process.env.ADMIN_E2E_ATTEMPT

test('anonymous admin API never exposes account or order data', async ({ request }) => {
  const response = await request.get('/api/admin/users/admin_e2e_customer')
  expect([401, 403, 404]).toContain(response.status())
  const text = await response.text()
  expect(text).not.toContain('customer@admin-e2e.invalid')
  expect(response.headers()['cache-control']).toContain('no-store')
})

test.describe('authenticated local admin', () => {
  test.skip(
    !cookie,
    'Set a local fixture cookie from scripts/seed-admin-local.mjs; no production bypass is installed.',
  )
  test.beforeEach(async ({ context, baseURL }) => {
    await context.addCookies([
      {
        name: 'tuneclue_session',
        value: cookie || '',
        url: baseURL || 'http://localhost:3000',
        httpOnly: true,
        sameSite: 'Lax',
      },
    ])
  })
  for (const width of [320, 390, 768, 1440]) {
    test(`four modules at ${width}px do not overflow page or emit analytics`, async ({ page }) => {
      const analytics: string[] = []
      page.on('request', (r) => {
        if (/google-analytics|googletagmanager/.test(r.url())) analytics.push(r.url())
      })
      await page.setViewportSize({ width, height: 900 })
      for (const path of ['/admin', '/admin/users', '/admin/orders', '/admin/recognitions']) {
        await page.goto(path)
        await expect(page.getByRole('navigation', { name: '管理模块' })).toBeVisible()
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
        ).toBe(true)
        await expect(page.locator('[data-site-header]')).toHaveCount(0)
        await expect(page.locator('meta[name=robots]').first()).toHaveAttribute(
          'content',
          /noindex/,
        )
      }
      expect(analytics).toEqual([])
    })
  }
  test('email search uses POST and opens account ledger without email in URL', async ({ page }) => {
    await page.goto('/admin/users')
    await page.getByLabel('完整邮箱 / 用户 ID').fill('customer@admin-e2e.invalid')
    await page.getByRole('button', { name: '搜索', exact: true }).click()
    await page.getByRole('link', { name: 'admin_e2e_customer', exact: true }).click()
    await expect(page.getByRole('heading', { name: '用户详情' })).toBeVisible()
    expect(page.url()).not.toContain('customer@')
    await expect(page.getByRole('heading', { name: '次数账本' })).toBeVisible()
  })
  test('compensation confirmation can be cancelled with Escape and restores keyboard focus', async ({
    page,
  }) => {
    test.skip(!fixtureAttempt, 'Seed a new failed local attempt and set ADMIN_E2E_ATTEMPT.')
    await page.goto(`/admin/recognitions/${fixtureAttempt}`)
    const button = page.getByRole('button', { name: '补回异常扣次', exact: true })
    await expect(button).toBeEnabled()
    await button.click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(button).toBeFocused()
  })
  test('confirmed real local DB compensation shows outcome without a money-refund API', async ({
    page,
  }) => {
    test.skip(
      !fixtureAttempt || process.env.ADMIN_E2E_WRITE !== '1',
      'Opt in only on disposable local fixture data.',
    )
    const posts: string[] = []
    page.on('request', (r) => {
      if (r.method() === 'POST') posts.push(new URL(r.url()).pathname)
    })
    await page.goto(`/admin/recognitions/${fixtureAttempt}`)
    await page.getByRole('button', { name: '补回异常扣次', exact: true }).click()
    await page.getByLabel('说明（5–500 字）').fill('本地验收夹具，确认技术失败后补回一次。')
    await page.getByRole('button', { name: '确认执行', exact: true }).click()
    await expect(page.getByText('已补回该请求实际扣除的次数。', { exact: true })).toBeVisible()
    expect(posts.filter((p) => p.includes('/return-credit'))).toHaveLength(1)
    expect(posts.some((p) => p.includes('/refund'))).toBe(false)
  })
})
