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

function artworkFrom(raw: NonNullable<AudDRawResponse['result']>) {
  const apple = raw.apple_music?.artwork?.url
  if (apple) return apple.replace('{w}', '600').replace('{h}', '600')
  return (
    raw.spotify?.album?.images?.find((image) => image.url)?.url ??
    raw.deezer?.album?.cover_xl ??
    raw.deezer?.album?.cover_big
  )
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
      spotify: raw.result.spotify?.external_urls?.spotify,
      appleMusic: raw.result.apple_music?.url,
      deezer: raw.result.deezer?.link,
      songLink: raw.result.song_link,
    },
  }
}
