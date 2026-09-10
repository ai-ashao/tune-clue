import type { TikTokResolvedPost, TikTokStructuredSource } from './types'
import { extractTikTokPostId, safeMediaRef, trustedTikTokMediaUrl } from './url-policy'

type UnknownRecord = Record<string, unknown>

export type ParsedTikTokPage = TikTokResolvedPost & {
  internalAudioUrl?: string
  internalVideoUrl?: string
}

export type TikTokOEmbed = {
  title?: string
  author_name?: string
  author_url?: string
  html?: string
  thumbnail_url?: string
}

export function parseTikTokPage(input: {
  inputUrl: string
  finalUrl: string
  html: string
  oEmbed?: TikTokOEmbed
}): ParsedTikTokPage {
  const universal = extractJsonScript(input.html, '__UNIVERSAL_DATA_FOR_REHYDRATION__')
  const sigi = extractJsonScript(input.html, 'SIGI_STATE')

  let item: UnknownRecord | undefined
  let source: TikTokStructuredSource = 'oembed-only'

  if (universal) {
    item = findUniversalItem(universal)
    if (item) source = 'universal-data'
  }

  if (!item && sigi) {
    item = findSigiItem(sigi, extractTikTokPostId(input.finalUrl))
    if (item) source = 'sigi-state'
  }

  const canonicalUrl =
    canonicalFromOEmbed(input.oEmbed) ||
    canonicalFromItem(item) ||
    normalizeCanonicalUrl(input.finalUrl)

  const videoId =
    extractTikTokPostId(canonicalUrl) ||
    extractTikTokPostId(input.finalUrl) ||
    videoIdFromOEmbed(input.oEmbed) ||
    stringValue(item?.id)

  if (!videoId) throw new Error('TikTok page did not expose a video ID.')

  const music = recordValue(item?.music)
  const video = recordValue(item?.video)
  const authorRecord = recordValue(item?.author)

  const audioCandidate = firstMediaUrl([
    pathValue(music, ['playUrl']),
    pathValue(music, ['play_url']),
    pathValue(music, ['playAddr']),
    pathValue(music, ['play_addr']),
    pathValue(music, ['playUrl', 'UrlList']),
    pathValue(music, ['playUrl', 'urlList']),
    pathValue(music, ['play_url', 'url_list']),
  ])

  const videoCandidate = firstMediaUrl([
    pathValue(video, ['playAddr']),
    pathValue(video, ['downloadAddr']),
    pathValue(video, ['play_addr']),
    pathValue(video, ['download_addr']),
    firstBitrateUrl(video),
  ])

  const rejectedMediaHosts = Array.from(
    new Set(
      [audioCandidate, videoCandidate]
        .filter((value): value is string => Boolean(value))
        .flatMap((value) => {
          if (trustedTikTokMediaUrl(value)) return []
          try {
            return [new URL(value.replace(/\\u002F/gi, '/').replace(/\\\//g, '/')).hostname]
          } catch {
            return ['<invalid-url>']
          }
        }),
    ),
  )

  return {
    inputUrl: input.inputUrl,
    canonicalUrl,
    videoId,
    source,
    title: stringValue(item?.desc) || input.oEmbed?.title,
    author:
      stringValue(authorRecord?.nickname) ||
      stringValue(authorRecord?.uniqueId) ||
      input.oEmbed?.author_name,
    musicTitle: stringValue(music?.title),
    musicAuthor: stringValue(music?.authorName) || stringValue(music?.author_name),
    durationSeconds: numberValue(video?.duration),
    audio: safeMediaRef('audio', 'music.playUrl', audioCandidate),
    video: safeMediaRef('video', 'video.playAddr', videoCandidate),
    rejectedMediaHosts,
    internalAudioUrl: trustedTikTokMediaUrl(audioCandidate)?.toString(),
    internalVideoUrl: trustedTikTokMediaUrl(videoCandidate)?.toString(),
  }
}

export function canonicalFromOEmbed(data: TikTokOEmbed | undefined) {
  if (!data?.html) return undefined

  const cite = data.html.match(/\bcite=(?:"([^"]+)"|'([^']+)')/i)
  const candidate = cite?.[1] || cite?.[2]
  if (candidate && /^https:\/\/(?:www\.)?tiktok\.com\//i.test(candidate)) {
    return normalizeCanonicalUrl(candidate)
  }

  const id = videoIdFromOEmbed(data)
  return id ? `https://www.tiktok.com/video/${id}` : undefined
}

export function videoIdFromOEmbed(data: TikTokOEmbed | undefined) {
  if (!data?.html) return undefined
  const match = data.html.match(/\bdata-video-id=(?:"(\d+)"|'(\d+)')/i)
  return match?.[1] || match?.[2] || data.html.match(/\/video\/(\d{8,})/i)?.[1]
}

export function extractJsonScript(html: string, id: string): unknown | undefined {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(`<script[^>]+id=["']${escaped}["'][^>]*>([\\s\\S]*?)<\\/script>`, 'i')
  const match = html.match(pattern)
  if (!match?.[1]) return undefined

  try {
    return JSON.parse(match[1])
  } catch {
    return undefined
  }
}

function findUniversalItem(value: unknown) {
  const root = recordValue(value)
  const detail = recordValue(recordValue(root?.__DEFAULT_SCOPE__)?.['webapp.video-detail'])

  const statusCode = numberValue(detail?.statusCode)
  if (statusCode && statusCode !== 0) {
    const statusMessage = stringValue(detail?.statusMsg) || 'TikTok post is unavailable.'
    throw new Error(statusMessage)
  }

  const item = recordValue(recordValue(detail?.itemInfo)?.itemStruct)
  return item || findLikelyItem(root)
}

function findSigiItem(value: unknown, videoId?: string) {
  const root = recordValue(value)
  const items = recordValue(root?.ItemModule)
  if (!items) return findLikelyItem(root)

  if (videoId) {
    const exact = recordValue(items[videoId])
    if (exact) return exact
  }

  for (const candidate of Object.values(items)) {
    const item = recordValue(candidate)
    if (item?.video) return item
  }

  return findLikelyItem(root)
}

function findLikelyItem(value: unknown, depth = 0): UnknownRecord | undefined {
  if (depth > 8) return undefined
  const record = recordValue(value)
  if (record) {
    if (record.video && (record.id || record.desc || record.author)) return record
    for (const child of Object.values(record)) {
      const found = findLikelyItem(child, depth + 1)
      if (found) return found
    }
    return undefined
  }

  if (Array.isArray(value)) {
    for (const child of value.slice(0, 100)) {
      const found = findLikelyItem(child, depth + 1)
      if (found) return found
    }
  }

  return undefined
}

function canonicalFromItem(item: UnknownRecord | undefined) {
  const author = recordValue(item?.author)
  const uniqueId = stringValue(author?.uniqueId)
  const id = stringValue(item?.id)
  if (!id) return undefined
  return uniqueId
    ? `https://www.tiktok.com/@${encodeURIComponent(uniqueId)}/video/${id}`
    : `https://www.tiktok.com/video/${id}`
}

function normalizeCanonicalUrl(value: string) {
  const url = new URL(value)
  url.hash = ''
  const id = extractTikTokPostId(url.toString())
  if (!id) return url.toString()

  const username = url.pathname.match(/\/@([^/]+)\/video\//i)?.[1]
  return username
    ? `https://www.tiktok.com/@${username}/video/${id}`
    : `https://www.tiktok.com/video/${id}`
}

function firstBitrateUrl(video: UnknownRecord | undefined) {
  const bitrateInfo = Array.isArray(video?.bitrateInfo) ? video.bitrateInfo : []
  for (const entry of bitrateInfo) {
    const record = recordValue(entry)
    const playAddr = recordValue(record?.PlayAddr) || recordValue(record?.playAddr)
    const url = firstMediaUrl([
      playAddr?.UrlList,
      playAddr?.urlList,
      playAddr?.url_list,
      playAddr?.url,
    ])
    if (url) return url
  }
  return undefined
}

function firstMediaUrl(values: unknown[]) {
  for (const value of values) {
    const result = deepFirstUrl(value)
    if (result) return result
  }
  return undefined
}

function deepFirstUrl(value: unknown, depth = 0): string | undefined {
  if (depth > 4) return undefined

  if (typeof value === 'string') {
    const normalized = value.replace(/\\u002F/gi, '/').replace(/\\\//g, '/')
    return /^https:\/\//i.test(normalized) ? normalized : undefined
  }

  if (Array.isArray(value)) {
    for (const child of value.slice(0, 20)) {
      const result = deepFirstUrl(child, depth + 1)
      if (result) return result
    }
    return undefined
  }

  const record = recordValue(value)
  if (record) {
    for (const key of ['UrlList', 'urlList', 'url_list', 'url', 'uri']) {
      const result = deepFirstUrl(record[key], depth + 1)
      if (result) return result
    }
  }

  return undefined
}

function pathValue(value: UnknownRecord | undefined, keys: string[]): unknown {
  let current: unknown = value
  for (const key of keys) {
    const record = recordValue(current)
    if (!record) return undefined
    current = record[key]
  }
  return current
}

function recordValue(value: unknown): UnknownRecord | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : undefined
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function numberValue(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}
