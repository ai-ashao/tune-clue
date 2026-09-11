import { parseEstimatedCost } from '@/lib/admin/config'
import { getCurrentSessionUser } from '@/lib/auth/session.server'
import { getTuneClueDb } from '@/lib/db.server'
import { FixedWindowRateLimiter, requestIdentity } from '@/lib/security/rate-limit'
import { TikTokFetchError } from '@/lib/tiktok/fetch.server'
import { runTikTokPoc, TikTokResolveError } from '@/lib/tiktok/resolve.server'
import { normalizeTikTokInputUrl } from '@/lib/tiktok/url-policy'
import { tuneClueFlags } from '@/lib/tuneclue-flags'
import { RecognitionFailure } from './attempts'
import { recognizeWithAudD } from './audd.server'
import {
  handleRecognition,
  type RecognitionInput,
  RecognitionInputError,
  readRecognitionStatus,
  recognitionJson,
} from './request-handler'
import {
  RecognitionRequestBodyTooLargeError,
  readBoundedRecognitionBody,
  validateRecognitionRequestHeaders,
  validateRecognitionSample,
} from './request-policy'

const limiter = new FixedWindowRateLimiter(10, 60 * 60_000)
async function localInput(request: Request): Promise<RecognitionInput> {
  const invalid = validateRecognitionRequestHeaders(request)
  if (invalid) throw new RecognitionInputError(invalid.code, invalid.status, invalid.message)
  let body: ArrayBuffer
  try {
    body = await readBoundedRecognitionBody(request)
  } catch (error) {
    if (error instanceof RecognitionRequestBodyTooLargeError)
      throw new RecognitionInputError('sample-too-large', 413, error.message)
    throw new RecognitionInputError(
      'invalid-request',
      400,
      'Could not read the recognition sample.',
    )
  }
  const form = await new Request(request.url, {
    method: 'POST',
    headers: { 'content-type': request.headers.get('content-type') || '' },
    body,
  })
    .formData()
    .catch(() => null)
  if (
    !form ||
    [...form.keys()].some((key) => !['sample', 'requestId'].includes(key)) ||
    form.getAll('sample').length !== 1 ||
    form.getAll('requestId').length !== 1
  )
    throw new RecognitionInputError('invalid-request', 400, 'Send sample and requestId only.')
  const sample = form.get('sample')
  const requestId = form.get('requestId')
  if (!(sample instanceof File) || typeof requestId !== 'string')
    throw new RecognitionInputError(
      'invalid-request',
      400,
      'A WAV sample and request ID are required.',
    )
  const sampleError = await validateRecognitionSample(sample)
  if (sampleError)
    throw new RecognitionInputError(sampleError.code, sampleError.status, sampleError.message)
  return { kind: 'local_file', sample, requestId }
}
async function tiktokInput(request: Request): Promise<RecognitionInput> {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') || ''))
    throw new RecognitionInputError('invalid-request', 415, 'Send a JSON request.')
  if (Number(request.headers.get('content-length') || '0') > 4096)
    throw new RecognitionInputError('invalid-request', 413, 'The request is too large.')
  const reader = request.body?.getReader()
  if (!reader)
    throw new RecognitionInputError('invalid-request', 400, 'Send a TikTok URL and request ID.')
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const part = await reader.read()
      if (part.done) break
      size += part.value.byteLength
      if (size > 4096) {
        await reader.cancel()
        throw new RecognitionInputError('invalid-request', 413, 'The request is too large.')
      }
      chunks.push(part.value)
    }
  } finally {
    reader.releaseLock()
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  let value: unknown
  try {
    value = JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    throw new RecognitionInputError('invalid-request', 400, 'Send valid JSON.')
  }
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new RecognitionInputError('invalid-request', 400, 'Send a TikTok URL and request ID.')
  const input = value as Record<string, unknown>
  if (
    Object.keys(input).some((key) => !['url', 'requestId'].includes(key)) ||
    typeof input.url !== 'string' ||
    typeof input.requestId !== 'string'
  )
    throw new RecognitionInputError('invalid-request', 400, 'Send url and requestId only.')
  let url: string
  try {
    url = normalizeTikTokInputUrl(input.url).toString()
  } catch {
    throw new RecognitionInputError(
      'invalid-url',
      400,
      'Paste a supported public TikTok video link.',
    )
  }
  return { kind: 'tiktok_url', url, requestId: input.requestId }
}
export async function serveRecognition(request: Request, kind: 'local_file' | 'tiktok_url') {
  if (kind === 'tiktok_url' && !tuneClueFlags.tiktok)
    return recognitionJson(
      {
        ok: false,
        code: 'source-unavailable',
        message: 'TikTok recognition is temporarily unavailable.',
      },
      503,
    )
  const limit = limiter.check(`${kind}:${requestIdentity(request)}`)
  if (!limit.allowed)
    return recognitionJson(
      { ok: false, code: 'rate-limited', message: 'Too many attempts. Try again later.' },
      429,
    )
  try {
    const { env } = await import('cloudflare:workers')
    const settings = env as unknown as Record<string, unknown>
    const token = typeof settings.AUDD_API_TOKEN === 'string' ? settings.AUDD_API_TOKEN : undefined
    return handleRecognition(request, {
      db: await getTuneClueDb(),
      user: getCurrentSessionUser,
      parse: kind === 'local_file' ? localInput : tiktokInput,
      unitCost: parseEstimatedCost(settings.AUDD_ESTIMATED_REQUEST_COST_USD),
      run: async (input, hooks) => {
        if (input.kind === 'local_file') return recognizeWithAudD(input.sample, { ...hooks, token })
        try {
          const result = await runTikTokPoc({
            url: input.url,
            action: 'recognize',
            execution: { ...hooks, token },
          })
          if (!result.recognition) throw new RecognitionFailure('provider-error', false)
          return result.recognition
        } catch (error) {
          if (error instanceof RecognitionFailure) throw error
          if (error instanceof TikTokResolveError || error instanceof TikTokFetchError) {
            if (hooks.signal.aborted) throw new RecognitionFailure('provider-error', false)
            throw new RecognitionFailure('source-unavailable', true)
          }
          throw error
        }
      },
    })
  } catch {
    return recognitionJson(
      {
        ok: false,
        code: 'recognition-unavailable',
        message: 'Recognition is temporarily unavailable.',
      },
      503,
    )
  }
}
export async function serveRecognitionStatus(request: Request) {
  try {
    return await readRecognitionStatus(
      request,
      await getTuneClueDb(),
      await getCurrentSessionUser(request),
    )
  } catch {
    return recognitionJson(
      {
        ok: false,
        code: 'recognition-unavailable',
        message: 'The search status could not be read.',
      },
      503,
    )
  }
}
