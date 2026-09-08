export type ProductMode = 'saas' | 'tool'
export type ProductSurface = 'pricing' | 'app' | 'guides'

export type ProductConfig = {
  mode: ProductMode
  brand: {
    name: string
    mark: string
    description: string
  }
  starter: {
    showPreviewBanner: boolean
  }
  surfaces?: Partial<Record<ProductSurface, boolean>>
}

export const productConfig: ProductConfig = {
  mode: 'tool',
  brand: {
    name: 'TuneClue',
    mark: 'TC',
    description: 'Find the song playing in a video or supported social-video link.',
  },
  starter: {
    showPreviewBanner: false,
  },
}

export function productSurfaceEnabled(
  surface: ProductSurface,
  config: ProductConfig = productConfig,
): boolean {
  const explicit = config.surfaces?.[surface]
  if (explicit !== undefined) return explicit
  if (surface === 'guides') return false
  return config.mode === 'saas'
}

export function validateProductConfig(config: ProductConfig): ReadonlyArray<string> {
  const issues: string[] = []

  if (!config.brand.name.trim()) issues.push('Product brand name is required.')
  if (!config.brand.description.trim()) issues.push('Product brand description is required.')

  const markLength = [...config.brand.mark.trim()].length
  if (markLength < 1 || markLength > 3) {
    issues.push('Product brand mark must contain 1–3 visible characters.')
  }

  return issues
}

export function surfaceModeForPath(pathname: string): ProductMode {
  if (pathname.startsWith('/tool-reference')) return 'tool'
  return productConfig.mode
}
