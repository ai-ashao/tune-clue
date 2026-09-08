import type { RecognitionApiResponse } from './types'

export async function recognizeAudioSample(sample: File): Promise<RecognitionApiResponse> {
  const body = new FormData()
  body.set('sample', sample, sample.name)

  const response = await fetch('/api/recognize', {
    method: 'POST',
    body,
  })

  const payload = (await response.json().catch(() => null)) as RecognitionApiResponse | null
  if (!payload) {
    return {
      ok: false,
      code: 'provider-error',
      message: 'TuneClue could not read the recognition response.',
    }
  }

  return payload
}
