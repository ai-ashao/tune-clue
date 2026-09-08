import type { Locale } from '@/i18n/config'
import {
  type ProductConfig,
  type ProductMode,
  productConfig,
  productSurfaceEnabled,
} from './product-config'
import { resolveToolPresentation, type ToolRegistryItem } from './tool-registry'

export type GuidesPlacement = 'header' | 'footer' | 'none'
export type HeaderLinkId = 'home' | 'workflow' | 'tools' | 'guides' | 'pricing'
export type LocalizedValue = Partial<Record<Locale, string>>

export type FooterToolGroupConfig = {
  id: string
  title: LocalizedValue
  toolIds: ReadonlyArray<string>
  maxItems?: number
  viewMore?: {
    label: LocalizedValue
    href: LocalizedValue
  }
}

export type FooterSecondaryPageId = 'about' | 'contact' | 'privacy' | 'terms'

export type FooterCustomLink = {
  id: string
  label: LocalizedValue
  href: LocalizedValue
}

export type HeaderCtaConfig = {
  label: LocalizedValue
  href: LocalizedValue
}

export type SiteNavigationConfig = {
  guidesPlacement: GuidesPlacement
  header: {
    links: ReadonlyArray<HeaderLinkId>
    toolsHref?: LocalizedValue
    cta?: HeaderCtaConfig
  }
  footer: {
    toolGroups: ReadonlyArray<FooterToolGroupConfig>
    secondaryPages: ReadonlyArray<FooterSecondaryPageId>
    customLinks?: ReadonlyArray<FooterCustomLink>
  }
}

export const saasSiteNavigation: SiteNavigationConfig = {
  guidesPlacement: 'header',
  header: {
    links: ['home', 'workflow', 'guides', 'pricing'],
    cta: {
      label: { en: 'Open app', 'zh-CN': '打开应用' },
      href: { en: '/login', 'zh-CN': '/login' },
    },
  },
  footer: {
    toolGroups: [],
    secondaryPages: ['about', 'contact', 'privacy', 'terms'],
  },
}

export const toolSiteNavigation: SiteNavigationConfig = {
  guidesPlacement: 'none',
  header: {
    links: ['tools'],
    toolsHref: { en: '/#tool' },
  },
  footer: {
    toolGroups: [
      {
        id: 'song-finders',
        title: { en: 'Song Finders' },
        toolIds: ['video-song-finder'],
        maxItems: 4,
      },
    ],
    secondaryPages: ['about', 'contact', 'privacy', 'terms'],
  },
}

export function siteNavigationForMode(
  mode: ProductMode,
  config?: ProductConfig,
): SiteNavigationConfig {
  const resolvedConfig = config ?? { ...productConfig, mode }
  const guidesEnabled = productSurfaceEnabled('guides', resolvedConfig)

  if (mode === 'tool') {
    return {
      ...toolSiteNavigation,
      guidesPlacement: guidesEnabled ? toolSiteNavigation.guidesPlacement : 'none',
      header: {
        ...toolSiteNavigation.header,
        links: toolSiteNavigation.header.links.filter(
          (linkId) => linkId !== 'guides' || guidesEnabled,
        ),
      },
    }
  }

  const pricingEnabled = productSurfaceEnabled('pricing', resolvedConfig)
  const appEnabled = productSurfaceEnabled('app', resolvedConfig)

  return {
    ...saasSiteNavigation,
    guidesPlacement: guidesEnabled ? saasSiteNavigation.guidesPlacement : 'none',
    header: {
      ...saasSiteNavigation.header,
      links: saasSiteNavigation.header.links.filter(
        (linkId) =>
          (linkId !== 'pricing' || pricingEnabled) && (linkId !== 'guides' || guidesEnabled),
      ),
      cta: appEnabled ? saasSiteNavigation.header.cta : undefined,
    },
  }
}

export const siteNavigation = siteNavigationForMode(productConfig.mode)

export type ResolvedFooterToolGroup = {
  id: string
  title: string
  tools: ReadonlyArray<ReturnType<typeof resolveToolPresentation>>
  viewMore?: {
    label: string
    href: string
  }
}

export function localizedNavigationValue(
  value: LocalizedValue,
  locale: Locale,
): string | undefined {
  return value[locale] ?? value.en ?? Object.values(value)[0]
}

export function resolveFooterToolGroups(input: {
  config: SiteNavigationConfig
  registry: ReadonlyArray<ToolRegistryItem>
  locale: Locale
}): ReadonlyArray<ResolvedFooterToolGroup> {
  const { config, registry, locale } = input
  const byId = new Map(registry.map((tool) => [tool.id, tool]))

  return config.footer.toolGroups.slice(0, 4).flatMap((group) => {
    const title = localizedNavigationValue(group.title, locale)
    if (!title) return []

    const limit = Math.min(Math.max(group.maxItems ?? 6, 1), 6)
    const tools = group.toolIds
      .map((id) => byId.get(id))
      .filter((tool): tool is ToolRegistryItem => Boolean(tool))
      .filter((tool) => tool.status === 'live')
      .slice(0, limit)
      .map((tool) => resolveToolPresentation(tool, locale))

    const viewMoreLabel = group.viewMore
      ? localizedNavigationValue(group.viewMore.label, locale)
      : undefined
    const viewMoreHref = group.viewMore
      ? localizedNavigationValue(group.viewMore.href, locale)
      : undefined

    if (tools.length === 0 && !(viewMoreLabel && viewMoreHref)) return []

    return [
      {
        id: group.id,
        title,
        tools,
        ...(viewMoreLabel && viewMoreHref
          ? { viewMore: { label: viewMoreLabel, href: viewMoreHref } }
          : {}),
      },
    ]
  })
}

function duplicates(values: ReadonlyArray<string>): ReadonlyArray<string> {
  const seen = new Set<string>()
  const duplicateValues = new Set<string>()
  for (const value of values) {
    if (seen.has(value)) duplicateValues.add(value)
    seen.add(value)
  }
  return [...duplicateValues]
}

export function validateSiteNavigation(
  config: SiteNavigationConfig,
  registry?: ReadonlyArray<ToolRegistryItem>,
): ReadonlyArray<string> {
  const issues: string[] = []
  const headerHasGuides = config.header.links.includes('guides')

  if (config.guidesPlacement === 'header' && !headerHasGuides) {
    issues.push('Guides placement is header but the header links do not include guides.')
  }
  if (config.guidesPlacement !== 'header' && headerHasGuides) {
    issues.push('Guides must not appear in the header when placement is footer or none.')
  }
  if (config.header.links.includes('tools') && !config.header.toolsHref) {
    issues.push('Header includes tools but no toolsHref is configured.')
  }

  if (config.header.cta) {
    const label = Object.values(config.header.cta.label).find(Boolean)
    const href = Object.values(config.header.cta.href).find(Boolean)
    if (!label) issues.push('Header CTA requires a label.')
    if (!href) issues.push('Header CTA requires an href.')
  }

  if (config.footer.toolGroups.length > 4) {
    issues.push('Footer tool directory supports at most four default groups.')
  }

  for (const duplicateId of duplicates(config.footer.toolGroups.map((group) => group.id))) {
    issues.push(`Duplicate footer tool-group id: ${duplicateId}`)
  }

  const registryById = registry ? new Map(registry.map((tool) => [tool.id, tool])) : undefined

  for (const group of config.footer.toolGroups) {
    if ((group.maxItems ?? 6) > 6) {
      issues.push(`Footer group ${group.id} must not show more than six tool links.`)
    }
    for (const duplicateToolId of duplicates(group.toolIds)) {
      issues.push(`Footer group ${group.id} contains duplicate tool id: ${duplicateToolId}`)
    }
    if (registryById) {
      for (const toolId of group.toolIds) {
        const tool = registryById.get(toolId)
        if (!tool) issues.push(`Footer group ${group.id} references unknown tool id: ${toolId}`)
        else if (tool.status !== 'live') {
          issues.push(`Footer group ${group.id} references non-live tool id: ${toolId}`)
        }
      }
    }
  }

  return issues
}

export function validateToolSiteNavigation(
  config: SiteNavigationConfig,
  registry?: ReadonlyArray<ToolRegistryItem>,
): ReadonlyArray<string> {
  const issues = [...validateSiteNavigation(config, registry)]

  if (!config.header.links.includes('tools')) {
    issues.push('Tool-site Header must include Tools.')
  }
  if (config.header.links.includes('workflow')) {
    issues.push('Tool-site Header must not retain the starter Workflow link.')
  }
  if (config.header.links.includes('pricing')) {
    issues.push(
      'Tool-site Header must not retain Pricing unless the product explicitly overrides the Tool-site default.',
    )
  }
  if (config.header.cta) {
    issues.push('Default Tool-site Header must not contain a SaaS-style CTA.')
  }

  return issues
}

export function validateSaasSiteNavigation(
  config: SiteNavigationConfig,
  registry?: ReadonlyArray<ToolRegistryItem>,
): ReadonlyArray<string> {
  const issues = [...validateSiteNavigation(config, registry)]

  if (!config.header.cta) {
    issues.push('Default SaaS Header should expose one primary CTA.')
  }

  return issues
}
