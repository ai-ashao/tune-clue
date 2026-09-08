import type { ToolLandingConfig } from '@/components/tool-landing/types'

type SiteIdentity = {
  name: string
  url: string
}

type JsonLdObject = Record<string, unknown>

function absoluteUrl(path: string, siteUrl: string) {
  return new URL(path, siteUrl).toString()
}

export function buildToolStructuredData(
  config: ToolLandingConfig,
  site: SiteIdentity,
): ReadonlyArray<JsonLdObject> {
  const canonical = absoluteUrl(config.seo.path, site.url)
  const structured: JsonLdObject[] = []

  structured.push({
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: config.hero.title,
    url: canonical,
    description: config.seo.description,
    applicationCategory:
      config.structuredData?.applicationCategory ??
      config.seo.applicationCategory ??
      'UtilitiesApplication',
    operatingSystem: config.structuredData?.operatingSystem ?? 'Any',
    ...(config.experience.free
      ? {
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: config.structuredData?.priceCurrency ?? 'USD',
          },
        }
      : {}),
  })

  const faqEnabled = config.structuredData?.enableFaq !== false
  if (faqEnabled && config.faq?.items.length) {
    structured.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: config.faq.items.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    })
  }

  const breadcrumbEnabled = config.structuredData?.enableBreadcrumbs !== false
  if (breadcrumbEnabled && config.breadcrumbs && config.breadcrumbs.length > 1) {
    structured.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: config.breadcrumbs.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.label,
        item: absoluteUrl(item.href, site.url),
      })),
    })
  }

  return structured
}
