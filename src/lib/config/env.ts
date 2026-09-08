export type PublicEnv = {
  siteUrl: string
  ga4Id?: string
  googleSiteVerification?: string
}

export function parsePublicEnv(source: Record<string, string | undefined>): PublicEnv {
  const rawSiteUrl = source.VITE_SITE_URL?.trim() || 'https://shiplean.dev'
  let siteUrl: string
  try {
    const url = new URL(rawSiteUrl)
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('unsupported protocol')
    siteUrl = url.toString().replace(/\/$/, '')
  } catch {
    throw new Error('VITE_SITE_URL must be an absolute http(s) URL.')
  }

  const ga4Id = source.VITE_GA4_ID?.trim() || undefined
  if (ga4Id && !/^G-[A-Z0-9]+$/.test(ga4Id)) {
    throw new Error('VITE_GA4_ID must look like G-XXXXXXXXXX.')
  }

  return {
    siteUrl,
    ga4Id,
    googleSiteVerification: source.VITE_GOOGLE_SITE_VERIFICATION?.trim() || undefined,
  }
}

export const publicEnv = parsePublicEnv(import.meta.env)
