import type { ToolRegistryItem } from '@/lib/tool-registry'

/**
 * Product repositories replace this empty registry with their live tools.
 * ShipLean core intentionally does not ship fake production tools.
 */
export const toolRegistry = [] satisfies ReadonlyArray<ToolRegistryItem>
