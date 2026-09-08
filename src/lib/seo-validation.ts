import { site } from './site'

export type SeoAuditIssue = {
  level: 'error' | 'warning'
  code: string
  field?: string
  message: string
}

export type SeoAuditResult = {
  errors: SeoAuditIssue[]
  warnings: SeoAuditIssue[]
}

export type SeoMetadataAuditInput = {
  title: string
  description: string
  path: string
  indexable?: boolean
  socialImage?: string
  heroTitle?: string
  heroDescription?: string
  primaryKeyword?: string
}

export function auditSeoMetadata(input: SeoMetadataAuditInput): SeoAuditResult {
  const issues: SeoAuditIssue[] = []
  const title = input.title.trim()
  const description = input.description.trim()

  if (!title) {
    issues.push(error('seo.title.required', 'title', 'SEO title is required.'))
  }
  if (!description) {
    issues.push(error('seo.description.required', 'description', 'SEO description is required.'))
  }
  if (!isSitePath(input.path)) {
    issues.push(
      error(
        'seo.path.invalid',
        'path',
        'SEO path must be "/" or an absolute site path starting with "/".',
      ),
    )
  }

  if (title.length > 0 && (title.length < 30 || title.length > 65)) {
    issues.push(
      warning(
        'seo.title.length',
        'title',
        `SEO title is ${title.length} characters; roughly 30–65 is a useful advisory range.`,
      ),
    )
  }
  if (description.length > 0 && (description.length < 100 || description.length > 180)) {
    issues.push(
      warning(
        'seo.description.length',
        'description',
        `SEO description is ${description.length} characters; roughly 120–160 is a useful English target, not a hard search-engine limit.`,
      ),
    )
  }
  if (
    input.heroDescription?.trim() &&
    normalizeText(input.heroDescription) === normalizeText(description)
  ) {
    issues.push(
      warning(
        'seo.description.matches-hero',
        'description',
        'SEO description and visible Hero description are identical; consider writing each for its own context.',
      ),
    )
  }
  if (title !== site.name && includesWords(title, site.name)) {
    issues.push(
      warning(
        'seo.title.includes-brand',
        'title',
        `SEO title already includes ${site.name}; pageHead() appends the brand automatically.`,
      ),
    )
  }

  if (input.socialImage) {
    try {
      const isRootRelative =
        input.socialImage.startsWith('/') && !input.socialImage.startsWith('//')
      const url = isRootRelative ? new URL(input.socialImage, site.url) : new URL(input.socialImage)
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Unsupported protocol')
    } catch {
      issues.push(
        warning(
          'seo.social-image.invalid',
          'socialImage',
          'Social image should be an absolute HTTP(S) URL or a root-relative site path.',
        ),
      )
    }
  }

  const primaryKeyword = input.primaryKeyword?.trim()
  if (primaryKeyword) {
    const intentMode = keywordIntentMode(primaryKeyword)

    if (intentMode === 'manual') {
      issues.push(
        warning(
          'seo.primary-keyword.manual-review',
          'primaryKeyword',
          'Primary keyword uses a script that the lightweight intent matcher does not evaluate reliably; review title, description, and Hero intent manually.',
        ),
      )
    } else {
      if (!matchesKeywordIntent(title, primaryKeyword, intentMode)) {
        issues.push(
          warning(
            'seo.primary-keyword.title',
            'primaryKeyword',
            'Primary keyword intent is not clearly reflected in the SEO title; review the wording manually.',
          ),
        )
      }
      if (!matchesKeywordIntent(description, primaryKeyword, intentMode)) {
        issues.push(
          warning(
            'seo.primary-keyword.description',
            'primaryKeyword',
            'Primary keyword intent is not clearly reflected in the SEO description; natural variants are allowed.',
          ),
        )
      }
      if (input.heroTitle && !matchesKeywordIntent(input.heroTitle, primaryKeyword, intentMode)) {
        issues.push(
          warning(
            'seo.primary-keyword.hero',
            'primaryKeyword',
            'Hero title may not clearly match the primary keyword intent; branded wording is allowed, so confirm manually.',
          ),
        )
      }
    }
  }

  return {
    errors: issues.filter((issue) => issue.level === 'error'),
    warnings: issues.filter((issue) => issue.level === 'warning'),
  }
}

function error(code: string, field: string, message: string): SeoAuditIssue {
  return { level: 'error', code, field, message }
}

function warning(code: string, field: string, message: string): SeoAuditIssue {
  return { level: 'warning', code, field, message }
}

function isSitePath(path: string): boolean {
  if (path !== '/' && !/^\/(?!\/)[^\s?#]+$/.test(path)) return false
  if (/%(?![0-9a-f]{2})/i.test(path)) return false

  try {
    return new URL(path, site.url).origin === new URL(site.url).origin
  } catch {
    return false
  }
}

function normalizeText(value: string): string {
  return value.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ')
}

function includesWords(value: string, phrase: string): boolean {
  return normalizeText(value).includes(normalizeText(phrase))
}

type KeywordIntentMode = 'latin' | 'cjk' | 'manual'

function keywordIntentMode(keyword: string): KeywordIntentMode {
  if (/[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/u.test(keyword)) return 'cjk'
  if (/\P{ASCII}/u.test(keyword)) return 'manual'
  return 'latin'
}

function matchesKeywordIntent(
  value: string,
  keyword: string,
  mode: Exclude<KeywordIntentMode, 'manual'>,
): boolean {
  return mode === 'cjk' ? matchesCjkIntent(value, keyword) : matchesLatinIntent(value, keyword)
}

function matchesLatinIntent(value: string, keyword: string): boolean {
  const valueTokens = intentTokens(value)
  const keywordTokens = intentTokens(keyword)
  if (keywordTokens.length === 0) return true
  const matched = keywordTokens.filter((token) =>
    valueTokens.some((candidate) => tokensAreRelated(token, candidate)),
  ).length
  return matched >= Math.max(1, Math.ceil(keywordTokens.length * 0.6))
}

function matchesCjkIntent(value: string, keyword: string): boolean {
  const normalizedValue = normalizeCjk(value)
  const normalizedKeyword = normalizeCjk(keyword)
  if (!normalizedKeyword) return true
  if (normalizedValue.includes(normalizedKeyword)) return true

  const keywordBigrams = ngrams(normalizedKeyword, 2)
  if (keywordBigrams.length === 0) return normalizedValue.includes(normalizedKeyword)

  const valueBigrams = new Set(ngrams(normalizedValue, 2))
  const matched = keywordBigrams.filter((gram) => valueBigrams.has(gram)).length
  return matched / keywordBigrams.length >= 0.6
}

function normalizeCjk(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, '')
}

function ngrams(value: string, size: number): string[] {
  const characters = [...value]
  if (characters.length < size) return characters.length ? [value] : []
  return Array.from({ length: characters.length - size + 1 }, (_, index) =>
    characters.slice(index, index + size).join(''),
  )
}

function intentTokens(value: string): string[] {
  const stopWords = new Set(['a', 'an', 'and', 'for', 'in', 'of', 'on', 'the', 'to', 'with'])
  return normalizeText(value)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1 && !stopWords.has(token))
}

function tokensAreRelated(left: string, right: string): boolean {
  if (left === right) return true
  const shorter = left.length <= right.length ? left : right
  const longer = shorter === left ? right : left
  if (shorter.length >= 5 && longer.startsWith(shorter)) return true

  let commonPrefix = 0
  while (commonPrefix < shorter.length && left[commonPrefix] === right[commonPrefix]) {
    commonPrefix += 1
  }
  return shorter.length >= 6 && commonPrefix >= shorter.length - 1
}
