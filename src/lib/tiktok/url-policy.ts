const INPUT_HOSTS = new Set([
  'tiktok.com',
  'www.tiktok.com',
  'm.tiktok.com',
  'vm.tiktok.com',
  'vt.tiktok.com',
])

const MEDIA_HOST_SUFFIXES = [
  '.tiktok.com',
  '.tiktokcdn.com',
  '.tiktokcdn-eu.com',
  '.tiktokcdn-us.com',
  '.tiktokv.com',
  '.tiktokv.us',
  '.muscdn.com',
  '.muscdn.net',
  '.byteoversea.com',
  '.ibytedtos.com',
  '.byteimg.com',
  '.bytegecko.com',
  '.akamaized.net',
] as const

const MAX_URL_LENGTH = 2_048

export class TikTokUrlPolicyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TikTokUrlPolicyError'
  }
}

export function normalizeTikTokInputUrl(value: string) {
  if (!value || value.length > MAX_URL_LENGTH) {
    throw new TikTokUrlPolicyError('TikTok URL is missing or too long.')
  }

  let url: URL
  try {
    url = new URL(value.trim())
  } catch {
    throw new TikTokUrlPolicyError('Paste a valid TikTok URL.')
  }

  if (url.protocol !== 'https:') {
    throw new TikTokUrlPolicyError('TikTok URLs must use HTTPS.')
  }

  if (url.username || url.password || url.port) {
    throw new TikTokUrlPolicyError('TikTok URL contains unsupported credentials or port.')
  }

  const host = url.hostname.toLowerCase()
  if (!INPUT_HOSTS.has(host)) {
    throw new TikTokUrlPolicyError('Only public tiktok.com links are supported.')
  }

  url.hash = ''
  return url
}

export function assertTikTokRedirectUrl(value: string, base: string) {
  let url: URL
  try {
    url = new URL(value, base)
  } catch {
    throw new TikTokUrlPolicyError('TikTok returned an invalid redirect.')
  }

  if (url.protocol !== 'https:' || url.username || url.password || url.port) {
    throw new TikTokUrlPolicyError('TikTok redirect left the allowed HTTPS origin set.')
  }

  if (!INPUT_HOSTS.has(url.hostname.toLowerCase())) {
    throw new TikTokUrlPolicyError('TikTok redirect left the allowed host set.')
  }

  url.hash = ''
  return url
}

export function extractTikTokPostId(value: string) {
  try {
    const url = new URL(value)
    return url.pathname.match(/\/video\/(\d{8,})/i)?.[1]
  } catch {
    return undefined
  }
}

export function trustedTikTokMediaUrl(value: string | undefined) {
  if (!value || value.length > 8_192) return undefined

  let url: URL
  try {
    url = new URL(value.replace(/\\u002F/gi, '/').replace(/\\\//g, '/'))
  } catch {
    return undefined
  }

  if (url.protocol !== 'https:' || url.username || url.password) return undefined
  if (url.port && url.port !== '443') return undefined

  const host = url.hostname.toLowerCase()
  if (isIpLiteral(host) || host === 'localhost' || host.endsWith('.localhost')) return undefined

  const allowed = MEDIA_HOST_SUFFIXES.some(
    (suffix) => host === suffix.slice(1) || host.endsWith(suffix),
  )
  return allowed ? url : undefined
}

export function safeMediaRef(kind: 'audio' | 'video', source: string, value: string | undefined) {
  const url = trustedTikTokMediaUrl(value)
  if (!url) return undefined
  return {
    kind,
    host: url.hostname,
    path: url.pathname,
    source,
  } as const
}

export function isKnownTikTokMediaHost(hostname: string) {
  const host = hostname.toLowerCase()
  return MEDIA_HOST_SUFFIXES.some((suffix) => host === suffix.slice(1) || host.endsWith(suffix))
}

function isIpLiteral(host: string) {
  if (host.startsWith('[') && host.endsWith(']')) return true
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) return true
  return false
}
