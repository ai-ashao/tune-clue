import type { RecognitionApiResponse } from './types'

export async function recognizeTikTokUrl(url: string): Promise<RecognitionApiResponse> {
  const response = await fetch('/api/tiktok/recognize', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url }),
  })

  const payload = (await response.json().catch(() => null)) as RecognitionApiResponse | null
  if (!payload) {
    return {
      ok: false,
      code: 'provider-error',
      message: 'TuneClue could not read the TikTok recognition response.',
    }
  }

  return payload
}
