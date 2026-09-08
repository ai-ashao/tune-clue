import type { ToolSeoBrief } from '@/lib/tool-seo-brief'

/**
 * SEO-first handoff from keyword/SERP research into ShipLean.
 *
 * Keep this null for the neutral SaaS starter.
 * Before changing productConfig.mode to `tool`, replace it with a research-backed brief.
 * ShipLean consumes the brief; keyword discovery and SERP research stay in external SEO skills.
 */
export const toolSeoBrief: ToolSeoBrief | null = null
