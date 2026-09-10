export type RecognitionStatus = 'matched' | 'no-match'

export type RecognitionLinks = {
  spotify?: string
  appleMusic?: string
  deezer?: string
  songLink?: string
}

export type RecognitionResult =
  | {
      status: 'matched'
      title: string
      artist: string
      album?: string
      releaseDate?: string
      artworkUrl?: string
      timecode?: string
      links: RecognitionLinks
    }
  | { status: 'no-match' }

export type RecognitionApiResponse =
  | { ok: true; result: RecognitionResult; remainingCredits: number }
  | {
      ok: false
      code:
        | 'invalid-request'
        | 'invalid-url'
        | 'sample-too-large'
        | 'source-unavailable'
        | 'provider-not-configured'
        | 'provider-error'
        | 'rate-limited'
        | 'auth-required'
        | 'auth-unavailable'
        | 'insufficient-credits'
      message: string
    }
