import { submitRecognition } from './reliable-client'
import type { RecognitionApiResponse } from './types'

export async function recognizeTikTokUrl(
  url: string,
  requestId = crypto.randomUUID(),
): Promise<RecognitionApiResponse> {
  return submitRecognition(
    '/api/tiktok/recognize',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url, requestId }),
    },
    requestId,
  )
}
