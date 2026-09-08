import type { RecognitionResult } from './types'

type AudDSpotify = {
  external_urls?: {
    spotify?: string
  }
  album?: {
    images?: ReadonlyArray<{ url?: string }>
  }
}

type AudDAppleMusic = {
  url?: string
  artwork?: {
    url?: string
  }
}

type AudDDeezer = {
  link?: string
  album?: {
    cover_xl?: string
    cover_big?: string
  }
}

export type AudDRawResponse = {
  status?: 'success' | 'error'
  result?: null | {
    artist?: string
    title?: string
    album?: string
    release_date?: string
    timecode?: string
    song_link?: string
    spotify?: AudDSpotify
    apple_music?: AudDAppleMusic
    deezer?: AudDDeezer
  }
  error?: {
    error_code?: number
    error_message?: string
  }
}

function safeHttpsUrl(value?: string) {
  if (!value) return undefined
  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url.toString() : undefined
  } catch {
    return undefined
  }
}

function safeArtworkUrl(value?: string) {
  const normalized = safeHttpsUrl(value)
  if (!normalized) return undefined

  const url = new URL(normalized)
  const host = url.hostname.toLowerCase()
  const trusted =
    host === 'i.scdn.co' ||
    host === 'e-cdns-images.dzcdn.net' ||
    host === 'mzstatic.com' ||
    host.endsWith('.mzstatic.com')

  return trusted ? url.toString() : undefined
}

function artworkFrom(raw: NonNullable<AudDRawResponse['result']>) {
  const apple = raw.apple_music?.artwork?.url
  if (apple) {
    const rendered = apple.replace('{w}', '600').replace('{h}', '600')
    const safe = safeArtworkUrl(rendered)
    if (safe) return safe
  }

  const spotify = raw.spotify?.album?.images?.find((image) => image.url)?.url
  const safeSpotify = safeArtworkUrl(spotify)
  if (safeSpotify) return safeSpotify

  return safeArtworkUrl(raw.deezer?.album?.cover_xl ?? raw.deezer?.album?.cover_big)
}

export function normalizeAudDResponse(raw: AudDRawResponse): RecognitionResult {
  if (raw.status !== 'success') {
    throw new Error(raw.error?.error_message || 'AudD returned an error.')
  }

  if (!raw.result) {
    return { status: 'no-match' }
  }

  const title = raw.result.title?.trim()
  const artist = raw.result.artist?.trim()
  if (!title || !artist) {
    throw new Error('AudD returned an incomplete match.')
  }

  return {
    status: 'matched',
    title,
    artist,
    album: raw.result.album?.trim() || undefined,
    releaseDate: raw.result.release_date?.trim() || undefined,
    artworkUrl: artworkFrom(raw.result),
    timecode: raw.result.timecode?.trim() || undefined,
    links: {
      spotify: safeHttpsUrl(raw.result.spotify?.external_urls?.spotify),
      appleMusic: safeHttpsUrl(raw.result.apple_music?.url),
      deezer: safeHttpsUrl(raw.result.deezer?.link),
      songLink: safeHttpsUrl(raw.result.song_link),
    },
  }
}
