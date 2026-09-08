import type { ToolLandingConfig } from '@/components/tool-landing/types'
import { defaultLocale } from '@/i18n/config'
import { auditSeoMetadata, type SeoAuditIssue, type SeoAuditResult } from './seo-validation'
import { validateEnglishToolMessaging } from './tool-messaging'
import type { ToolRegistryItem } from './tool-registry'

function duplicates(values: ReadonlyArray<string>): ReadonlyArray<string> {
  const seen = new Set<string>()
  const duplicateValues = new Set<string>()
  for (const value of values) {
    if (seen.has(value)) duplicateValues.add(value)
    seen.add(value)
  }
  return [...duplicateValues]
}

export function validateToolLandingConfig(
  config: ToolLandingConfig,
  registry: ReadonlyArray<ToolRegistryItem> = [],
): ReadonlyArray<string> {
  return auditToolLandingConfig(config, registry).errors.map((issue) =>
    issue.code === 'seo.path.invalid'
      ? 'Tool SEO path must be an absolute site path starting with "/".'
      : issue.message,
  )
}

export function auditToolLandingConfig(
  config: ToolLandingConfig,
  registry: ReadonlyArray<ToolRegistryItem> = [],
): SeoAuditResult {
  const errors: SeoAuditIssue[] = []
  const indexable = config.seo.indexable !== false

  if (indexable && !config.seo.primaryKeyword?.trim()) {
    errors.push(
      toolError(
        'tool.seo.primary-keyword.required',
        'seo.primaryKeyword',
        'Indexable Tool Landing pages require a primaryKeyword from the SEO brief.',
      ),
    )
  }

  const seoAudit = auditSeoMetadata({
    ...config.seo,
    indexable,
    heroTitle: config.hero.title,
    heroDescription: config.hero.description,
  })
  errors.push(...seoAudit.errors)

  if (config.version === '0.2') {
    const highlights = config.completion?.highlights ?? []
    if (highlights.length < 3 || highlights.length > 5) {
      errors.push(
        toolError(
          'tool.completion.count',
          'completion.highlights',
          'Tool Landing v0.2 requires 3–5 completion highlights.',
        ),
      )
    }
    for (const duplicate of duplicates(highlights)) {
      errors.push(
        toolError(
          'tool.completion.duplicate',
          'completion.highlights',
          `Duplicate completion highlight: ${duplicate}`,
        ),
      )
    }
    if (config.features) {
      errors.push(
        toolError(
          'tool.features.deprecated',
          'features',
          'Tool Landing v0.2 must use capabilities instead of deprecated features.',
        ),
      )
    }
  }

  if (config.capabilities) {
    for (const duplicateId of duplicates(config.capabilities.items.map((item) => item.id))) {
      errors.push(
        toolError(
          'tool.capability.duplicate-id',
          'capabilities.items',
          `Duplicate capability id: ${duplicateId}`,
        ),
      )
    }
  }

  if (config.breadcrumbs && config.breadcrumbs.length > 1) {
    const current = config.breadcrumbs.at(-1)
    if (current?.href !== config.seo.path) {
      errors.push(
        toolError(
          'tool.breadcrumb.current-path',
          'breadcrumbs',
          'The current breadcrumb href must match the Tool Landing SEO path.',
        ),
      )
    }
  }

  if (config.structuredData?.enableFaq && !config.faq?.items.length) {
    errors.push(
      toolError(
        'tool.structured-data.faq',
        'structuredData.enableFaq',
        'FAQ structured data requires visible FAQ content.',
      ),
    )
  }

  if (
    config.structuredData?.enableBreadcrumbs &&
    (!config.breadcrumbs || config.breadcrumbs.length < 2)
  ) {
    errors.push(
      toolError(
        'tool.structured-data.breadcrumbs',
        'structuredData.enableBreadcrumbs',
        'Breadcrumb structured data requires visible breadcrumbs.',
      ),
    )
  }

  if (config.relatedTools) {
    const ids = config.relatedTools.toolIds
    if (ids.includes(config.toolId)) {
      errors.push(
        toolError(
          'tool.related.current-tool',
          'relatedTools.toolIds',
          'Related Tools must not include the current tool id.',
        ),
      )
    }
    for (const duplicateId of duplicates(ids)) {
      errors.push(
        toolError(
          'tool.related.duplicate-id',
          'relatedTools.toolIds',
          `Duplicate Related Tool id: ${duplicateId}`,
        ),
      )
    }

    if (registry.length > 0) {
      const byId = new Map(registry.map((tool) => [tool.id, tool]))
      for (const id of ids) {
        const tool = byId.get(id)
        if (!tool) {
          errors.push(
            toolError(
              'tool.related.unknown-id',
              'relatedTools.toolIds',
              `Unknown Related Tool id: ${id}`,
            ),
          )
        } else if (tool.status !== 'live') {
          errors.push(
            toolError(
              'tool.related.not-live',
              'relatedTools.toolIds',
              `Related Tool ${id} is not live.`,
            ),
          )
        }
      }
    }
  }

  const locale = config.locale ?? defaultLocale
  if (locale === 'en') {
    for (const message of validateEnglishToolMessaging({
      heroDescription: config.hero.description,
      seoTitle: config.seo.title,
      seoDescription: config.seo.description,
      experience: config.experience,
    })) {
      errors.push(toolError('tool.messaging.invalid-claim', 'experience', message))
    }
  }

  return { errors, warnings: seoAudit.warnings }
}

function toolError(code: string, field: string, message: string): SeoAuditIssue {
  return { level: 'error', code, field, message }
}
