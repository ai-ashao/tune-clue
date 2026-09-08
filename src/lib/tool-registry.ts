import { defaultLocale, type Locale, localeConfig, supportedLocales } from '@/i18n/config'

export type ToolRegistryLocalization = {
  label: string
  href: string
  description?: string
}

export type ToolRegistryItem = {
  id: string
  label: string
  href: string
  description?: string
  tags?: ReadonlyArray<string>
  status: 'live' | 'planned'
  /**
   * SEO indexability is explicit opt-in.
   * A live tool enters sitemap only when indexable === true.
   */
  indexable?: boolean
  localizations?: Partial<Record<Locale, ToolRegistryLocalization>>
}

export type ResolvedToolRegistryItem = Omit<ToolRegistryItem, 'localizations'> & {
  label: string
  href: string
  description?: string
}

export type ToolRouteMatch = {
  tool: ToolRegistryItem
  locale: Locale
  path: string
}

function normalizePath(pathname: string): string {
  const path = pathname.split(/[?#]/, 1)[0] || '/'
  return path.length > 1 ? path.replace(/\/+$/, '') : path
}

export function toolPathForLocale(tool: ToolRegistryItem, locale: Locale): string | undefined {
  const localized = tool.localizations?.[locale]?.href
  if (localized) return localized
  return locale === defaultLocale ? tool.href : undefined
}

export function resolveToolPresentation(
  tool: ToolRegistryItem,
  locale: Locale,
): ResolvedToolRegistryItem {
  const localized = tool.localizations?.[locale]

  return {
    id: tool.id,
    label: localized?.label ?? tool.label,
    href: localized?.href ?? tool.href,
    description: localized?.description ?? tool.description,
    tags: tool.tags,
    status: tool.status,
    indexable: tool.indexable,
  }
}

export function findToolRouteByPath(
  registry: ReadonlyArray<ToolRegistryItem>,
  pathname: string,
): ToolRouteMatch | undefined {
  const normalized = normalizePath(pathname)

  for (const tool of registry) {
    if (tool.status !== 'live') continue

    for (const locale of supportedLocales) {
      const path = toolPathForLocale(tool, locale)
      if (path && normalizePath(path) === normalized) {
        return { tool, locale, path }
      }
    }
  }

  return undefined
}

export function toolHreflangAlternates(
  registry: ReadonlyArray<ToolRegistryItem>,
  toolId: string,
): Array<{ locale: Locale | 'x-default'; path: string }> {
  const tool = registry.find((candidate) => candidate.id === toolId && candidate.status === 'live')
  if (!tool) return []

  const localized = supportedLocales.flatMap((locale) => {
    const path = toolPathForLocale(tool, locale)
    return path ? [{ locale, path }] : []
  })

  if (localized.length < 2) return []

  const fallback = toolPathForLocale(tool, defaultLocale) ?? localized[0]?.path
  return fallback ? [...localized, { locale: 'x-default' as const, path: fallback }] : localized
}

export function toolLocaleAlternatesForPath(
  registry: ReadonlyArray<ToolRegistryItem>,
  pathname: string,
): Array<{
  locale: Locale
  path: string
  label: string
  shortLabel: string
}> {
  const current = findToolRouteByPath(registry, pathname)
  if (!current) return []

  return supportedLocales.flatMap((locale) => {
    if (locale === current.locale) return []

    const path = toolPathForLocale(current.tool, locale)
    if (!path) return []

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

export function toolSitemapPaths(registry: ReadonlyArray<ToolRegistryItem>): ReadonlyArray<string> {
  return registry
    .filter((tool) => tool.status === 'live' && tool.indexable === true)
    .flatMap((tool) =>
      supportedLocales.flatMap((locale) => {
        const path = toolPathForLocale(tool, locale)
        return path ? [path] : []
      }),
    )
}

export function validateToolRegistry(
  registry: ReadonlyArray<ToolRegistryItem>,
): ReadonlyArray<string> {
  const issues: string[] = []
  const seenIds = new Set<string>()
  const seenPaths = new Map<string, string>()

  for (const tool of registry) {
    if (seenIds.has(tool.id)) {
      issues.push(`Duplicate tool registry id: ${tool.id}`)
    }
    seenIds.add(tool.id)

    if (!tool.href.startsWith('/')) {
      issues.push(`Tool ${tool.id} href must be an absolute site path starting with "/".`)
    }

    if (tool.indexable === true && tool.status !== 'live') {
      issues.push(`Tool ${tool.id} cannot be indexable until its status is live.`)
    }

    for (const locale of supportedLocales) {
      const path = toolPathForLocale(tool, locale)
      if (!path) continue

      if (!path.startsWith('/')) {
        issues.push(
          `Tool ${tool.id} ${locale} href must be an absolute site path starting with "/".`,
        )
        continue
      }

      const normalized = normalizePath(path)
      const existing = seenPaths.get(normalized)
      const owner = `${tool.id}:${locale}`

      if (existing && existing !== owner) {
        issues.push(`Duplicate tool route ${normalized}: ${existing} and ${owner}.`)
      } else {
        seenPaths.set(normalized, owner)
      }
    }
  }

  return issues
}

export function assertUniqueToolRegistry(registry: ReadonlyArray<ToolRegistryItem>) {
  const issue = validateToolRegistry(registry).find((candidate) =>
    candidate.startsWith('Duplicate tool registry id:'),
  )
  if (issue) throw new Error(issue)
}

export function resolveRelatedTools(input: {
  registry: ReadonlyArray<ToolRegistryItem>
  currentToolId: string
  requestedIds?: ReadonlyArray<string>
  maxItems?: number
  locale?: Locale
}): ReadonlyArray<ResolvedToolRegistryItem> {
  const { registry, currentToolId, requestedIds, maxItems = 6, locale = defaultLocale } = input
  assertUniqueToolRegistry(registry)

  const live = registry.filter((tool) => tool.status === 'live' && tool.id !== currentToolId)

  const selected =
    requestedIds && requestedIds.length > 0
      ? (() => {
          const byId = new Map(live.map((tool) => [tool.id, tool]))
          return requestedIds
            .map((id) => byId.get(id))
            .filter((tool): tool is ToolRegistryItem => Boolean(tool))
            .slice(0, maxItems)
        })()
      : (() => {
          const current = registry.find((tool) => tool.id === currentToolId)
          const currentTags = new Set(current?.tags ?? [])

          return [...live]
            .map((tool) => ({
              tool,
              score: (tool.tags ?? []).reduce(
                (total, tag) => total + (currentTags.has(tag) ? 1 : 0),
                0,
              ),
            }))
            .filter(({ score }) => score > 0)
            .sort((a, b) => b.score - a.score || a.tool.label.localeCompare(b.tool.label))
            .slice(0, maxItems)
            .map(({ tool }) => tool)
        })()

  return selected.map((tool) => resolveToolPresentation(tool, locale))
}
