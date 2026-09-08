import type { ToolLandingConfig } from '@/components/tool-landing/types'
import { toolRegistry as defaultToolRegistry } from '@/modules/tool-registry'
import { pageHead } from './seo'
import { type ToolRegistryItem, toolHreflangAlternates } from './tool-registry'

export function toolPageHead(
  config: Pick<ToolLandingConfig, 'toolId' | 'seo'>,
  registry: ReadonlyArray<ToolRegistryItem> = defaultToolRegistry,
) {
  return pageHead({
    title: config.seo.title,
    description: config.seo.description,
    path: config.seo.path,
    alternates: toolHreflangAlternates(registry, config.toolId),
    indexable: config.seo.indexable !== false,
    socialImage: config.seo.socialImage,
  })
}
