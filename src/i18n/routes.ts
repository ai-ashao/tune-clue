import { type GuideSlug, guides } from '@/lib/guides'
import { productSurfaceEnabled } from '@/lib/product-config'
import { siteIndexingEnabled } from '@/lib/site-indexing'
import { toolLocaleAlternatesForPath, toolSitemapPaths } from '@/lib/tool-registry'
import { toolRegistry } from '@/modules/tool-registry'
import { defaultLocale, type Locale, localeConfig, supportedLocales } from './config'

export type PublicPageId =
  | 'home'
  | 'pricing'
  | 'guides'
  | 'about'
  | 'contact'
  | 'privacy'
  | 'terms'
  | `guide:${GuideSlug}`
export type LocalizedPaths = Partial<Record<Locale, string>>

export type PublicPageRoute = {
  id: PublicPageId
  indexable: boolean
  paths: LocalizedPaths
}

const pricingIndexable = productSurfaceEnabled('pricing')
const guidesIndexable = productSurfaceEnabled('guides')

const staticPages: PublicPageRoute[] = [
  { id: 'home', indexable: true, paths: { en: '/' } },
  { id: 'pricing', indexable: pricingIndexable, paths: { en: '/pricing' } },
  { id: 'guides', indexable: guidesIndexable, paths: { en: '/guides' } },
  { id: 'about', indexable: true, paths: { en: '/about' } },
  { id: 'contact', indexable: true, paths: { en: '/contact' } },
  { id: 'privacy', indexable: true, paths: { en: '/privacy-policy' } },
  { id: 'terms', indexable: true, paths: { en: '/terms-of-service' } },
]

const guidePages: PublicPageRoute[] = guides.map((guide) => ({
  id: guidePageId(guide.slug),
  indexable: guidesIndexable,
  paths: { en: `/guides/${guide.slug}` },
}))

export const publicPageRoutes: ReadonlyArray<PublicPageRoute> = [...staticPages, ...guidePages]

export type LocaleAlternate = {
  locale: Locale
  path: string
  label: string
  shortLabel: string
}

export function guidePageId(slug: GuideSlug): `guide:${GuideSlug}` {
  return `guide:${slug}`
}

export function localizedPath(pageId: PublicPageId, locale: Locale): string | undefined {
  return publicPageRoutes.find((page) => page.id === pageId)?.paths[locale]
}

export function isPublicPageIndexable(pageId: PublicPageId): boolean {
  const page = publicPageRoutes.find((candidate) => candidate.id === pageId)
  if (!page) throw new Error(`Unknown public page: ${pageId}`)
  return siteIndexingEnabled && page.indexable
}

export function localizedPathOrDefault(pageId: PublicPageId, locale: Locale): string {
  const page = publicPageRoutes.find((candidate) => candidate.id === pageId)
  const path = page?.paths[locale] || page?.paths[defaultLocale]
  if (!path) throw new Error(`Missing localized route for ${pageId}`)
  return path
}

export function resolvePublicPage(
  pathname: string,
): { pageId: PublicPageId; locale: Locale; path: string } | undefined {
  const normalized = normalizePath(pathname)
  for (const page of publicPageRoutes) {
    for (const locale of supportedLocales) {
      const path = page.paths[locale]
      if (path && normalizePath(path) === normalized) return { pageId: page.id, locale, path }
    }
  }
  return undefined
}

export function localeAlternatesForPath(pathname: string): LocaleAlternate[] {
  const current = resolvePublicPage(pathname)

  if (current) {
    const page = publicPageRoutes.find((candidate) => candidate.id === current.pageId)
    if (!page) return []

    return supportedLocales.flatMap((locale) => {
      const path = page.paths[locale]
      if (!path || locale === current.locale) return []
      return [
        {
          locale,
          path,
          label: localeConfig[locale].label,
          shortLabel: localeConfig[locale].shortLabel,
        },
      ]
    })
  }

  return toolLocaleAlternatesForPath(toolRegistry, pathname)
}

export function hreflangAlternates(pageId: PublicPageId): Array<{
  locale: Locale | 'x-default'
  path: string
}> {
  const page = publicPageRoutes.find((candidate) => candidate.id === pageId)
  if (!page) throw new Error(`Unknown public page: ${pageId}`)
  const localized = supportedLocales.flatMap((locale) => {
    const path = page.paths[locale]
    return path ? [{ locale, path }] : []
  })
  if (localized.length < 2) return []

  const fallback = page.paths[defaultLocale] || localized[0]?.path
  return fallback ? [...localized, { locale: 'x-default', path: fallback }] : localized
}

export function sitemapPaths(): string[] {
  if (!siteIndexingEnabled) return []

  return Array.from(
    new Set([
      ...publicPageRoutes.flatMap((page) =>
        page.indexable
          ? supportedLocales.flatMap((locale) => {
              const path = page.paths[locale]
              return path ? [path] : []
            })
          : [],
      ),
      ...toolSitemapPaths(toolRegistry),
    ]),
  )
}

function normalizePath(pathname: string): string {
  const path = pathname.split(/[?#]/, 1)[0] || '/'
  return path.length > 1 ? path.replace(/\/+$/, '') : path
}
