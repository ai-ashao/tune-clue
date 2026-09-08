import { type AudDRawResponse, normalizeAudDResponse } from './normalize-audd'
import type { RecognitionResult } from './types'

const AUDD_ENDPOINT = 'https://api.audd.io/'
const MAX_STANDARD_SAMPLE_BYTES = 10 * 1024 * 1024

function auddToken() {
  const token = process.env.AUDD_API_TOKEN?.trim()
  if (!token) {
    throw new Error('AUDD_API_TOKEN is not configured.')
  }
  return token
}

export async function recognizeWithAudD(sample: File): Promise<RecognitionResult> {
  if (sample.size <= 0) throw new Error('The recognition sample is empty.')
  if (sample.size > MAX_STANDARD_SAMPLE_BYTES) {
    throw new Error('The recognition sample exceeds the AudD Standard 10 MB limit.')
  }

  const form = new FormData()
  form.set('api_token', auddToken())
  form.set('file', sample, sample.name || 'sample.wav')
  form.set('return', 'apple_music,spotify,deezer')

  const response = await fetch(AUDD_ENDPOINT, {
    method: 'POST',
    body: form,
  })

  if (!response.ok) {
    throw new Error(`AudD request failed with HTTP ${response.status}.`)
  }

  const raw = (await response.json()) as AudDRawResponse
  return normalizeAudDResponse(raw)
}
