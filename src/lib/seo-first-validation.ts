import { type GuideSlug, guides } from '@/lib/guides'
import { type ProductConfig, productConfig, productSurfaceEnabled } from '@/lib/product-config'
import { type ToolSeoBrief, validateToolSeoBriefForProduct } from '@/lib/tool-seo-brief'
import { toolSeoBrief } from '@/modules/tool-seo-brief'

const starterGuideSlugs = new Set<GuideSlug>([
  'build-with-the-skill',
  'protected-app-shell',
  'cloudflare-boundaries',
])

export function validateSeoFirstState(input: {
  config: ProductConfig
  brief: ToolSeoBrief | null
  guideSlugs?: ReadonlyArray<string>
}): ReadonlyArray<string> {
  const issues = [...validateToolSeoBriefForProduct(input.config, input.brief)]

  if (productSurfaceEnabled('guides', input.config)) {
    const guideSlugs = input.guideSlugs ?? guides.map((guide) => guide.slug)
    const starterResidue = guideSlugs.filter((slug) => starterGuideSlugs.has(slug as GuideSlug))
    if (starterResidue.length > 0) {
      issues.push(
        `Guides cannot be indexable while ShipLean starter guide content remains: ${starterResidue.join(
          ', ',
        )}`,
      )
    }
  }

  return issues
}

export function validateSeoFirstProductState(): ReadonlyArray<string> {
  return validateSeoFirstState({
    config: productConfig,
    brief: toolSeoBrief,
  })
}
