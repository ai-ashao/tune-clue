import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { localeFromPathname, supportedLocales } from '../src/i18n/config'
import { shellMessages } from '../src/i18n/messages'
import { productHomeMessages } from '../src/i18n/product-home-messages'
import {
  hreflangAlternates,
  localeAlternatesForPath,
  publicPageRoutes,
  resolvePublicPage,
  sitemapPaths,
} from '../src/i18n/routes'
import { siteIndexingEnabled } from '../src/lib/site-indexing'

describe('locale-aware route registry', () => {
  it('detects only exact locale path prefixes', () => {
    expect(localeFromPathname('/')).toBe('en')
    expect(localeFromPathname('/pricing')).toBe('en')
    expect(localeFromPathname('/zh')).toBe('zh-CN')
    expect(localeFromPathname('/zh/missing')).toBe('zh-CN')
    expect(localeFromPathname('/zh-fake')).toBe('en')
  })

  it('keeps every registered path unique and resolvable to its page identity', () => {
    const paths = publicPageRoutes.flatMap((page) =>
      supportedLocales.flatMap((locale) => {
        const path = page.paths[locale]
        if (!path) return []
        expect(resolvePublicPage(path)).toEqual({ pageId: page.id, locale, path })
        return [path]
      }),
    )

    expect(new Set(paths).size).toBe(paths.length)
  })

  it('creates reciprocal hreflang only for real localized equivalents', () => {
    expect(hreflangAlternates('home')).toEqual([])
    expect(hreflangAlternates('pricing')).toEqual([])
    expect(hreflangAlternates('guides')).toEqual([])
  })

  it('offers a locale switch only when the current page has an equivalent route', () => {
    expect(localeAlternatesForPath('/')).toEqual([])
    expect(localeAlternatesForPath('/zh')).toEqual([])
    expect(localeAlternatesForPath('/pricing')).toEqual([])
    expect(localeAlternatesForPath('/missing')).toEqual([])
  })

  it('derives the indexable sitemap paths from the same registry', () => {
    const expected = publicPageRoutes.flatMap((page) =>
      page.indexable
        ? supportedLocales.flatMap((locale) => {
            const path = page.paths[locale]
            return path ? [path] : []
          })
        : [],
    )

    expect(sitemapPaths()).toEqual(siteIndexingEnabled ? expected : [])
    expect(new Set(sitemapPaths()).size).toBe(sitemapPaths().length)

    expect(publicPageRoutes.find((page) => page.id === 'privacy')?.indexable).toBe(true)
    expect(publicPageRoutes.find((page) => page.id === 'terms')?.indexable).toBe(true)
    expect(siteIndexingEnabled).toBe(false)
    expect(sitemapPaths()).not.toContain('/privacy-policy')
    expect(sitemapPaths()).not.toContain('/terms-of-service')
  })

  it('ships structurally complete message dictionaries for every supported locale', () => {
    expect(Object.keys(shellMessages).sort()).toEqual([...supportedLocales].sort())
    expect(messageShape(shellMessages['zh-CN'])).toEqual(messageShape(shellMessages.en))

    expect(Object.keys(productHomeMessages).sort()).toEqual([...supportedLocales].sort())
    expect(messageShape(productHomeMessages['zh-CN'])).toEqual(messageShape(productHomeMessages.en))
  })

  it('keeps the shipped home route as a thin wrapper around the shared page component', () => {
    const englishRoute = readFileSync('src/routes/index.tsx', 'utf8')

    expect(englishRoute).toContain('<ProductHome locale="en" />')
  })
})

function messageShape(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(messageShape)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, messageShape(child)]),
    )
  }
  return typeof value
}
