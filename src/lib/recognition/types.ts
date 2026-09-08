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
  | {
      status: 'no-match'
    }

export type RecognitionApiResponse =
  | {
      ok: true
      result: RecognitionResult
    }
  | {
      ok: false
      code:
        | 'invalid-request'
        | 'sample-too-large'
        | 'provider-not-configured'
        | 'provider-error'
        | 'rate-limited'
      message: string
    }
