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
import { isLegalProfileLaunchReady } from '../src/lib/legal'
import { legalProfile } from '../src/modules/legal-profile'

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
    expect(hreflangAlternates('home')).toEqual([
      { locale: 'en', path: '/' },
      { locale: 'zh-CN', path: '/zh' },
      { locale: 'x-default', path: '/' },
    ])
    expect(hreflangAlternates('pricing')).toEqual([])
    expect(hreflangAlternates('guides')).toEqual([])
  })

  it('offers a locale switch only when the current page has an equivalent route', () => {
    expect(localeAlternatesForPath('/')).toMatchObject([{ locale: 'zh-CN', path: '/zh' }])
    expect(localeAlternatesForPath('/zh')).toMatchObject([{ locale: 'en', path: '/' }])
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

    expect(sitemapPaths()).toEqual(expected)
    expect(new Set(sitemapPaths()).size).toBe(sitemapPaths().length)

    const legalIndexable = isLegalProfileLaunchReady(legalProfile)
    expect(publicPageRoutes.find((page) => page.id === 'privacy')?.indexable).toBe(legalIndexable)
    expect(publicPageRoutes.find((page) => page.id === 'terms')?.indexable).toBe(legalIndexable)
    expect(sitemapPaths().includes('/privacy-policy')).toBe(legalIndexable)
    expect(sitemapPaths().includes('/terms-of-service')).toBe(legalIndexable)
  })

  it('ships structurally complete message dictionaries for every supported locale', () => {
    expect(Object.keys(shellMessages).sort()).toEqual([...supportedLocales].sort())
    expect(messageShape(shellMessages['zh-CN'])).toEqual(messageShape(shellMessages.en))

    expect(Object.keys(productHomeMessages).sort()).toEqual([...supportedLocales].sort())
    expect(messageShape(productHomeMessages['zh-CN'])).toEqual(messageShape(productHomeMessages.en))
  })

  it('keeps localized route files as thin wrappers around one shared page component', () => {
    const englishRoute = readFileSync('src/routes/index.tsx', 'utf8')
    const chineseRoute = readFileSync('src/routes/zh.index.tsx', 'utf8')

    expect(englishRoute).toContain('<ProductHome locale="en" />')
    expect(chineseRoute).toContain('<ProductHome locale="zh-CN" />')
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
