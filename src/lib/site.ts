import { publicEnv } from './config/env'
import { productConfig } from './product-config'

export const site = {
  name: productConfig.brand.name,
  url: publicEnv.siteUrl,
  description: productConfig.brand.description,
}

export function absoluteUrl(path = '/') {
  return new URL(path, site.url).toString()
}
