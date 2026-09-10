import { expect, type Locator, test } from '@playwright/test'
import { productSurfaceEnabled } from '@/lib/product-config'

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
] as const

const fixtures = [
  {
    name: 'text',
    path: '/tool-reference',
    completion: ['Character count', 'Word count', 'Instant local result'],
  },
  {
    name: 'upload',
    path: '/tool-reference-upload',
    completion: ['Batch-ready input', 'Local processing', 'Multiple image formats'],
  },
] as const

const legalDocuments = [
  { name: 'privacy', path: '/privacy-policy', heading: 'Privacy Policy' },
  { name: 'terms', path: '/terms-of-service', heading: 'Terms of Service' },
] as const

async function expectInsideViewport(locator: Locator, viewportHeight: number) {
  await expect(locator).toBeVisible()
  const box = await locator.boundingBox()
  expect(box).not.toBeNull()
  expect(box?.y).toBeGreaterThanOrEqual(0)
  expect(box ? box.y + box.height : Infinity).toBeLessThanOrEqual(viewportHeight + 4)
}

for (const viewport of viewports) {
  test(`active product homepage at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.goto('/')

    const header = page.locator('[data-site-header]')
    const mode = await header.getAttribute('data-product-surface-mode')

    expect(['saas', 'tool']).toContain(mode)
    await expect(page.getByText('Ship useful products, skip the boilerplate tax')).toHaveCount(0)

    if (mode === 'saas') {
      const home = page.locator('[data-product-mode-home="saas"]')
      await expect(home).toBeVisible()
      await expect(home.getByRole('heading', { level: 1 })).toBeVisible()
      await expect(page.locator('[data-site-header] [data-header-cta]')).toHaveCount(1)
    } else {
      const home = page.locator('[data-product-mode-home="tool"]')
      await expect(home).toBeVisible()
      await expectInsideViewport(page.locator('[data-tool-title]'), viewport.height)
      await expectInsideViewport(page.locator('[data-tool-description]'), viewport.height)
      await expectInsideViewport(page.locator('[data-tool-primary-region]'), viewport.height)
      await expectInsideViewport(page.locator('[data-tool-constraints]'), viewport.height)
      await expectInsideViewport(page.locator('[data-tool-value-signals]'), viewport.height)
      await expectInsideViewport(page.locator('[data-tool-completion]'), viewport.height)
      await expect(page.locator('[data-site-header] [data-header-cta]')).toHaveCount(0)

      const primaryAction = page.locator('[data-tool-primary-action]')
      await expect(primaryAction).toBeVisible()
      await expect(primaryAction).toBeEnabled()
    }

    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      await page.evaluate(() => window.innerWidth),
    )
  })
}

test('local upload reaches the identify workbench with the pending file', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('#tool')).toHaveAttribute('data-mounted', 'true')
  await page.locator('input[type="file"]').setInputFiles({
    name: 'known-song-sample.wav',
    mimeType: 'audio/wav',
    buffer: Buffer.from('RIFF0000WAVEfmt '),
  })
  await page.getByRole('button', { name: 'Find song' }).click()

  await expect(page).toHaveURL(/\/identify$/)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Choose the clearest music moment' }),
  ).toBeVisible()
  await expect(page.getByText('Choose the source again')).toHaveCount(0)
})

test('auth and credit pages fail closed before Google and D1 are configured', async ({ page }) => {
  const sessionResponse = await page.request.get('/api/auth/session')
  expect(sessionResponse.ok()).toBe(true)
  expect(await sessionResponse.json()).toEqual({ available: false, authenticated: false })

  await page.goto('/account')
  await expect(page.getByRole('heading', { level: 1, name: 'Account' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Continue with Google' })).toHaveCount(0)
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,nofollow')

  await page.goto('/earn-credits')
  await expect(page.getByRole('heading', { level: 1, name: 'Earn free credits' })).toBeVisible()
  await expect(page.getByText(/not configured in this environment yet/i)).toBeVisible()
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,nofollow')
})

for (const fixture of fixtures) {
  for (const viewport of viewports) {
    test(`${fixture.name} tool first viewport contract at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto(fixture.path)

      await expectInsideViewport(page.locator('[data-tool-title]'), viewport.height)
      await expectInsideViewport(page.locator('[data-tool-description]'), viewport.height)
      await expectInsideViewport(page.locator('[data-tool-primary-region]'), viewport.height)
      await expectInsideViewport(page.locator('[data-tool-constraints]'), viewport.height)

      const valueSignals = page.locator('[data-tool-value-signals]')
      await expectInsideViewport(valueSignals, viewport.height)
      await expect(valueSignals).toContainText('Free')
      await expect(valueSignals).toContainText('Online')
      await expect(valueSignals).toContainText('No installation')
      await expect(valueSignals).toContainText('No signup')

      const completion = page.locator('[data-tool-completion]')
      await expectInsideViewport(completion, viewport.height)
      for (const expected of fixture.completion) {
        await expect(completion).toContainText(expected)
      }

      const firstViewport = page.locator('[data-tool-first-viewport]')
      const firstViewportBox = await firstViewport.boundingBox()
      expect(firstViewportBox).not.toBeNull()
      expect(
        firstViewportBox ? firstViewportBox.y + firstViewportBox.height : Infinity,
      ).toBeLessThanOrEqual(viewport.height + 4)

      const primaryAction = page.locator('[data-tool-primary-action]')
      await expect(primaryAction).toBeVisible()
      await expect(primaryAction).toBeEnabled()
      await primaryAction.focus()
      await expect(primaryAction).toBeFocused()

      if (fixture.name === 'text') {
        const labelBox = await page
          .locator('[data-reference-tool] [data-slot="field-label"]')
          .boundingBox()
        const controlBox = await page.locator('[data-reference-tool] textarea').boundingBox()
        expect(labelBox).not.toBeNull()
        expect(controlBox).not.toBeNull()
        expect(
          labelBox && controlBox ? controlBox.y - (labelBox.y + labelBox.height) : 0,
        ).toBeGreaterThanOrEqual(7)
      }

      await expect(page.locator('[data-site-header]')).toHaveAttribute(
        'data-product-surface-mode',
        'tool',
      )
      await expect(page.locator('[data-site-header] [data-header-cta]')).toHaveCount(0)

      const headerGuides = page.locator('[data-site-header] a', { hasText: 'Guides' })
      const footerGuides = page.locator('[data-site-footer] a', { hasText: 'Guides' })
      expect((await headerGuides.count()) + (await footerGuides.count())).toBe(
        productSurfaceEnabled('guides') ? 1 : 0,
      )

      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        await page.evaluate(() => window.innerWidth),
      )
    })
  }
}

for (const legalFixture of legalDocuments) {
  for (const viewport of viewports) {
    test(`${legalFixture.name} legal template at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto(legalFixture.path)

      const legalDocument = page.locator(`[data-legal-document="${legalFixture.name}"]`)
      await expect(legalDocument.getByRole('heading', { level: 1 })).toHaveText(
        legalFixture.heading,
      )
      await expect(page.locator('meta[name="robots"][content="noindex,nofollow"]')).toHaveCount(1)
      await expect(legalDocument.getByRole('navigation')).toBeVisible()

      const supportLink = legalDocument.locator('a[href^="mailto:"]')
      await expect(supportLink).toBeVisible()

      const firstSectionLink = legalDocument.getByRole('navigation').locator('a').first()
      await firstSectionLink.focus()
      await expect(firstSectionLink).toBeFocused()

      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        await page.evaluate(() => window.innerWidth),
      )
    })
  }
}
