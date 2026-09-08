import { defaultLocale, type Locale, supportedLocales } from '@/i18n/config'
import type { ProductConfig } from './product-config'

export type ToolSearchIntent =
  | 'tool'
  | 'download'
  | 'convert'
  | 'generate'
  | 'lookup'
  | 'resize'
  | 'compress'
  | 'edit'
  | 'other'

export type ToolSeoPageType = 'tool' | 'guide' | 'category'

export type ToolSeoEvidence = {
  source: string
  note?: string
}

export type ToolSeoFirstBatchPage = {
  keyword: string
  path: string
  pageType: ToolSeoPageType
  locale?: Locale
}

export type ToolSeoBrief = {
  status: 'ready'
  primaryKeyword: string
  localizedPrimaryKeywords?: Partial<Record<Locale, string>>
  searchIntent: ToolSearchIntent
  primaryPage: string
  supportingKeywords: ReadonlyArray<string>
  firstBatchPages: ReadonlyArray<ToolSeoFirstBatchPage>
  locales: ReadonlyArray<Locale>
  evidence: ReadonlyArray<ToolSeoEvidence>
}

export function primaryKeywordForLocale(
  brief: ToolSeoBrief | null,
  locale: Locale,
): string | undefined {
  if (!brief) return undefined
  if (locale === defaultLocale) return brief.primaryKeyword.trim() || undefined
  return brief.localizedPrimaryKeywords?.[locale]?.trim() || undefined
}

export function validateToolSeoBrief(brief: ToolSeoBrief): ReadonlyArray<string> {
  const issues: string[] = []

  if (!brief.primaryKeyword.trim()) {
    issues.push('Tool SEO Brief requires a primaryKeyword.')
  }
  if (!isSitePath(brief.primaryPage)) {
    issues.push('Tool SEO Brief primaryPage must be a root-relative site path.')
  }
  if (brief.locales.length === 0) {
    issues.push('Tool SEO Brief requires at least one locale.')
  }

  const unsupportedLocales = brief.locales.filter((locale) => !supportedLocales.includes(locale))
  for (const locale of unsupportedLocales) {
    issues.push(`Tool SEO Brief contains unsupported locale: ${locale}`)
  }

  for (const locale of brief.locales) {
    const keyword = primaryKeywordForLocale(brief, locale)
    if (!keyword) {
      issues.push(`Tool SEO Brief requires a primary keyword for locale: ${locale}`)
    }
  }

  if (brief.firstBatchPages.length === 0) {
    issues.push('Tool SEO Brief requires at least one first-batch page.')
  }

  const primaryPage = normalizePath(brief.primaryPage)
  if (
    brief.firstBatchPages.length > 0 &&
    !brief.firstBatchPages.some((page) => normalizePath(page.path) === primaryPage)
  ) {
    issues.push('Tool SEO Brief firstBatchPages must include the primaryPage.')
  }

  const seenPaths = new Set<string>()
  for (const page of brief.firstBatchPages) {
    if (!page.keyword.trim()) {
      issues.push(`Tool SEO Brief page ${page.path || '(missing path)'} requires a keyword.`)
    }
    if (!isSitePath(page.path)) {
      issues.push(`Tool SEO Brief page path must be root-relative: ${page.path}`)
      continue
    }

    const normalized = normalizePath(page.path)
    if (seenPaths.has(normalized)) {
      issues.push(`Tool SEO Brief contains duplicate page path: ${normalized}`)
    }
    seenPaths.add(normalized)

    if (page.locale && !brief.locales.includes(page.locale)) {
      issues.push(
        `Tool SEO Brief page ${page.path} uses locale ${page.locale} outside the declared locales.`,
      )
    }
  }

  const normalizedSupporting = brief.supportingKeywords
    .map((keyword) => keyword.trim().toLowerCase())
    .filter(Boolean)
  if (new Set(normalizedSupporting).size !== normalizedSupporting.length) {
    issues.push('Tool SEO Brief contains duplicate supportingKeywords.')
  }

  if (brief.evidence.length === 0) {
    issues.push('Tool SEO Brief requires at least one research evidence item.')
  }
  for (const item of brief.evidence) {
    if (!item.source.trim()) {
      issues.push('Tool SEO Brief evidence requires a non-empty source.')
    }
  }

  return issues
}

export function validateToolSeoBriefForProduct(
  config: ProductConfig,
  brief: ToolSeoBrief | null,
): ReadonlyArray<string> {
  if (config.mode !== 'tool') return []
  if (!brief) {
    return [
      'Tool Mode requires a ready Tool SEO Brief before the product can pass the SEO-first contract.',
    ]
  }
  return validateToolSeoBrief(brief)
}

function isSitePath(path: string): boolean {
  return path === '/' || /^\/(?!\/)[^\s?#]+$/.test(path)
}

function normalizePath(path: string): string {
  return path.length > 1 ? path.replace(/\/+$/, '') : path
}
