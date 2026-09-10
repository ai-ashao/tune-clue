export type TikTokStructuredSource = 'universal-data' | 'sigi-state' | 'oembed-only'

export type TikTokMediaRef = {
  kind: 'audio' | 'video'
  host: string
  path: string
  source: string
}

export type TikTokMediaProbe = {
  ok: boolean
  status: number
  contentType?: string
  contentLength?: number
  bytesRead: number
  acceptsRange: boolean
}

export type TikTokResolvedPost = {
  inputUrl: string
  canonicalUrl: string
  videoId: string
  source: TikTokStructuredSource
  title?: string
  author?: string
  musicTitle?: string
  musicAuthor?: string
  durationSeconds?: number
  audio?: TikTokMediaRef
  video?: TikTokMediaRef
  rejectedMediaHosts: string[]
}

export type TikTokPocAction = 'resolve' | 'probe' | 'recognize'

export type TikTokPocErrorCode =
  | 'invalid-url'
  | 'not-configured'
  | 'unauthorized'
  | 'upstream-blocked'
  | 'upstream-rate-limited'
  | 'upstream-failed'
  | 'post-unavailable'
  | 'structured-data-missing'
  | 'audio-url-missing'
  | 'media-unavailable'
  | 'media-too-large'
  | 'provider-error'
