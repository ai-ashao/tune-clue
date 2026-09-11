import { submitRecognition } from './reliable-client'
import type { RecognitionApiResponse } from './types'

export async function recognizeAudioSample(
  sample: File,
  requestId = crypto.randomUUID(),
): Promise<RecognitionApiResponse> {
  const body = new FormData()
  body.set('sample', sample, sample.name)
  body.set('requestId', requestId)
  return submitRecognition('/api/recognize', { method: 'POST', body }, requestId)
}
