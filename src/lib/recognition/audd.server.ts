import { type ExecutionHooks, RecognitionFailure } from './attempts'
import { type AudDRawResponse, normalizeAudDResponse } from './normalize-audd'
import type { RecognitionResult } from './types'

const AUDD_ENDPOINT = 'https://api.audd.io/'
const MAX_STANDARD_SAMPLE_BYTES = 10 * 1024 * 1024
export class AudDConfigurationError extends RecognitionFailure {
  constructor() {
    super('provider-not-configured')
    this.name = 'AudDConfigurationError'
  }
}
export type AudDExecution = Partial<ExecutionHooks> & { token?: string }
export async function recognizeWithAudD(
  sample: File,
  execution: AudDExecution = {},
): Promise<RecognitionResult> {
  execution.signal?.throwIfAborted()
  const token =
    execution.token?.trim() ||
    (
      globalThis as { process?: { env?: Record<string, string | undefined> } }
    ).process?.env?.AUDD_API_TOKEN?.trim()
  if (!token) throw new AudDConfigurationError()
  if (sample.size <= 0 || sample.size > MAX_STANDARD_SAMPLE_BYTES)
    throw new RecognitionFailure('provider-error')
  const form = new FormData()
  form.set('api_token', token)
  form.set('file', sample, sample.name || 'sample.wav')
  form.set('return', 'apple_music,spotify,deezer')
  // A recorded attempt is not a provider invoice: the process can stop between
  // this durable marker and the external network send.
  await execution.beforeProvider?.()
  execution.signal?.throwIfAborted()
  let response: Response
  try {
    response = await fetch(AUDD_ENDPOINT, {
      method: 'POST',
      body: form,
      signal: execution.signal || AbortSignal.timeout(120_000),
    })
  } catch {
    throw new RecognitionFailure('provider-error', false)
  }
  if (!response.ok) throw new RecognitionFailure('provider-error')
  let raw: AudDRawResponse
  try {
    raw = (await response.json()) as AudDRawResponse
  } catch (error) {
    throw new RecognitionFailure('provider-error', error instanceof SyntaxError)
  }
  try {
    return normalizeAudDResponse(raw)
  } catch {
    throw new RecognitionFailure('provider-error')
  }
}
