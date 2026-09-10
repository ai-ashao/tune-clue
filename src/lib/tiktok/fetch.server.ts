import type { TikTokMediaProbe } from './types'
import {
  assertTikTokRedirectUrl,
  isKnownTikTokMediaHost,
  normalizeTikTokInputUrl,
  trustedTikTokMediaUrl,
} from './url-policy'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36'

const MAX_REDIRECTS = 5
const MAX_HTML_BYTES = 4 * 1024 * 1024
const PROBE_BYTES = 64 * 1024
const MAX_AUDIO_BYTES = 9 * 1024 * 1024
const FETCH_TIMEOUT_MS = 9_000

export class TikTokFetchError extends Error {
  constructor(
    readonly code:
      | 'upstream-blocked'
      | 'upstream-rate-limited'
      | 'upstream-failed'
      | 'media-unavailable'
      | 'media-too-large',
    message: string,
    readonly status?: number,
  ) {
    super(message)
    this.name = 'TikTokFetchError'
  }
}

export type TikTokPageFetch = {
  finalUrl: string
  html: string
  cookieHeader?: string
  status: number
}

export async function fetchTikTokPage(inputUrl: string): Promise<TikTokPageFetch> {
  let current = normalizeTikTokInputUrl(inputUrl)
  const cookies = new Map<string, string>()

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const response = await fetchWithTimeout(
      current.toString(),
      {
        method: 'GET',
        redirect: 'manual',
        headers: {
          accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'accept-language': 'en-US,en;q=0.8',
          'cache-control': 'no-cache',
          pragma: 'no-cache',
          'user-agent': USER_AGENT,
          ...(cookies.size ? { cookie: serializeCookies(cookies) } : {}),
        },
      },
      FETCH_TIMEOUT_MS,
    )

    mergeSetCookies(cookies, response.headers)

    if (isRedirect(response.status)) {
      const location = response.headers.get('location')
      if (!location) {
        throw new TikTokFetchError(
          'upstream-failed',
          'TikTok returned a redirect without a Location header.',
          response.status,
        )
      }
      if (redirectCount === MAX_REDIRECTS) {
        throw new TikTokFetchError('upstream-failed', 'TikTok redirect limit exceeded.')
      }
      current = assertTikTokRedirectUrl(location, current.toString())
      continue
    }

    classifyTikTokStatus(response.status)
    const html = await readBoundedText(response, MAX_HTML_BYTES)
    return {
      finalUrl: response.url || current.toString(),
      html,
      cookieHeader: cookies.size ? serializeCookies(cookies) : undefined,
      status: response.status,
    }
  }

  throw new TikTokFetchError('upstream-failed', 'TikTok redirect resolution failed.')
}

export async function fetchTikTokOEmbed(url: string) {
  const endpoint = new URL('https://www.tiktok.com/oembed')
  endpoint.searchParams.set('url', normalizeTikTokInputUrl(url).toString())

  const response = await fetchWithTimeout(
    endpoint.toString(),
    {
      headers: {
        accept: 'application/json',
        'user-agent': USER_AGENT,
      },
    },
    FETCH_TIMEOUT_MS,
  )

  if (!response.ok) return undefined
  return response.json().catch(() => undefined)
}

export async function probeTikTokMedia(input: {
  mediaUrl: string
  referer: string
  cookieHeader?: string
}): Promise<TikTokMediaProbe> {
  const mediaUrl = assertTrustedMedia(input.mediaUrl)
  const response = await fetchWithTimeout(
    mediaUrl,
    {
      method: 'GET',
      redirect: 'manual',
      headers: {
        accept: '*/*',
        range: `bytes=0-${PROBE_BYTES - 1}`,
        referer: input.referer,
        'user-agent': USER_AGENT,
        ...(input.cookieHeader ? { cookie: input.cookieHeader } : {}),
      },
    },
    FETCH_TIMEOUT_MS,
  )

  const contentLength = parseContentLength(response.headers.get('content-length'))
  const contentType = response.headers.get('content-type')?.split(';', 1)[0]?.trim()
  let bytesRead = 0

  if (response.body) {
    const reader = response.body.getReader()
    try {
      while (bytesRead < PROBE_BYTES) {
        const { done, value } = await reader.read()
        if (done) break
        bytesRead += value?.byteLength || 0
        if (bytesRead >= PROBE_BYTES) {
          await reader.cancel().catch(() => undefined)
          break
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  return {
    ok: response.ok || response.status === 206,
    status: response.status,
    contentType,
    contentLength,
    bytesRead,
    acceptsRange:
      response.status === 206 ||
      response.headers.get('accept-ranges')?.toLowerCase().includes('bytes') === true,
  }
}

export async function fetchTikTokAudioFile(input: {
  mediaUrl: string
  referer: string
  cookieHeader?: string
}) {
  const mediaUrl = assertTrustedMedia(input.mediaUrl)
  const response = await fetchWithTimeout(
    mediaUrl,
    {
      method: 'GET',
      redirect: 'manual',
      headers: {
        accept: 'audio/*,*/*;q=0.8',
        referer: input.referer,
        'user-agent': USER_AGENT,
        ...(input.cookieHeader ? { cookie: input.cookieHeader } : {}),
      },
    },
    15_000,
  )

  if (!response.ok) {
    throw new TikTokFetchError(
      'media-unavailable',
      `TikTok audio CDN returned HTTP ${response.status}.`,
      response.status,
    )
  }

  const declaredLength = parseContentLength(response.headers.get('content-length'))
  if (declaredLength && declaredLength > MAX_AUDIO_BYTES) {
    throw new TikTokFetchError(
      'media-too-large',
      'TikTok audio exceeds the PoC 9 MB safety limit.',
      413,
    )
  }

  const contentType =
    response.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase() ||
    'application/octet-stream'

  const bytes = await readBoundedBytes(response, MAX_AUDIO_BYTES)
  if (!bytes.byteLength) {
    throw new TikTokFetchError('media-unavailable', 'TikTok audio response was empty.')
  }

  const filename = `tiktok-audio.${extensionForContentType(contentType)}`
  return new File([bytes], filename, { type: contentType })
}

function assertTrustedMedia(value: string) {
  const url = trustedTikTokMediaUrl(value)
  if (!url || !isKnownTikTokMediaHost(url.hostname)) {
    throw new TikTokFetchError('media-unavailable', 'TikTok returned an untrusted media host.')
  }
  return url.toString()
}

function classifyTikTokStatus(status: number) {
  if (status === 401 || status === 403) {
    throw new TikTokFetchError(
      'upstream-blocked',
      `TikTok blocked the Cloudflare-native page request with HTTP ${status}.`,
      status,
    )
  }
  if (status === 429) {
    throw new TikTokFetchError(
      'upstream-rate-limited',
      'TikTok rate-limited the Cloudflare-native page request.',
      status,
    )
  }
  if (status < 200 || status >= 300) {
    throw new TikTokFetchError(
      'upstream-failed',
      `TikTok page request failed with HTTP ${status}.`,
      status,
    )
  }
}

async function readBoundedText(response: Response, maxBytes: number) {
  const bytes = await readBoundedBytes(response, maxBytes)
  return new TextDecoder().decode(bytes)
}

async function readBoundedBytes(response: Response, maxBytes: number) {
  if (!response.body) return new Uint8Array()

  const declaredLength = parseContentLength(response.headers.get('content-length'))
  if (declaredLength && declaredLength > maxBytes) {
    throw new TikTokFetchError(
      'media-too-large',
      `Upstream response exceeds the ${maxBytes} byte limit.`,
      413,
    )
  }

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (!value) continue

      total += value.byteLength
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined)
        throw new TikTokFetchError(
          'media-too-large',
          `Upstream response exceeds the ${maxBytes} byte limit.`,
          413,
        )
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }

  const result = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.byteLength
  }
  return result
}

function mergeSetCookies(target: Map<string, string>, headers: Headers) {
  const extended = headers as Headers & { getSetCookie?: () => string[] }
  const values =
    typeof extended.getSetCookie === 'function'
      ? extended.getSetCookie()
      : headers.get('set-cookie')
        ? [headers.get('set-cookie') as string]
        : []

  for (const value of values) {
    const pair = value.split(';', 1)[0]?.trim()
    const separator = pair?.indexOf('=') ?? -1
    if (!pair || separator <= 0) continue
    target.set(pair.slice(0, separator), pair.slice(separator + 1))
  }
}

function serializeCookies(cookies: Map<string, string>) {
  return Array.from(cookies, ([name, value]) => `${name}=${value}`).join('; ')
}

function isRedirect(status: number) {
  return [301, 302, 303, 307, 308].includes(status)
}

function parseContentLength(value: string | null) {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
}

function extensionForContentType(contentType: string) {
  if (contentType.includes('mpeg')) return 'mp3'
  if (contentType.includes('mp4') || contentType.includes('m4a')) return 'm4a'
  if (contentType.includes('aac')) return 'aac'
  if (contentType.includes('wav')) return 'wav'
  if (contentType.includes('ogg')) return 'ogg'
  return 'bin'
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new TikTokFetchError('upstream-failed', 'TikTok upstream request timed out.')
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}
