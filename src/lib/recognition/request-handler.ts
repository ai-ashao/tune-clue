import { UUID } from '../admin/http'
import type { BillingDb } from '../billing/types'
import {
  type Attempt,
  attemptResponse,
  type ExecutionHooks,
  executeRecognition,
  fingerprintSource,
} from './attempts'
import type { RecognitionApiResponse, RecognitionResult } from './types'

export type RecognitionInput =
  | { requestId: string; kind: 'local_file'; sample: File }
  | { requestId: string; kind: 'tiktok_url'; url: string }
export type RecognitionServices = {
  db: BillingDb
  user: (request: Request) => Promise<{ id: string } | undefined>
  parse: (request: Request) => Promise<RecognitionInput>
  run: (input: RecognitionInput, hooks: ExecutionHooks) => Promise<RecognitionResult>
  unitCost: number | null
}
export class RecognitionInputError extends Error {
  constructor(
    readonly code:
      | 'invalid-request'
      | 'invalid-url'
      | 'sample-too-large'
      | 'source-unavailable'
      | 'rate-limited',
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}
export function recognitionJson(data: RecognitionApiResponse, status = 200) {
  return Response.json(data, {
    status,
    headers: { 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex, nofollow' },
  })
}
export function recognitionStatus(payload: RecognitionApiResponse) {
  if (payload.ok) return 200
  return payload.code === 'in-progress'
    ? 202
    : payload.code === 'insufficient-credits'
      ? 402
      : payload.code === 'request-conflict'
        ? 409
        : payload.code === 'provider-not-configured'
          ? 503
          : payload.code === 'source-unavailable'
            ? 422
            : payload.code === 'provider-error'
              ? 502
              : payload.code === 'result-unknown' || payload.code === 'result-expired'
                ? 409
                : 400
}
export async function handleRecognition(request: Request, services: RecognitionServices) {
  let requestId: string | undefined
  try {
    const user = await services.user(request)
    if (!user)
      return recognitionJson(
        { ok: false, code: 'auth-required', message: 'Sign in with Google to identify a song.' },
        401,
      )
    const input = await services.parse(request)
    requestId = input.requestId
    if (!UUID.test(requestId))
      throw new RecognitionInputError(
        'invalid-request',
        400,
        'A valid recognition requestId is required.',
      )
    const fingerprint = await fingerprintSource(
      input.kind,
      input.kind === 'local_file' ? await input.sample.arrayBuffer() : input.url,
    )
    const result = await executeRecognition(
      services.db,
      { userId: user.id, requestId, source: input.kind, fingerprint, unitCost: services.unitCost },
      (hooks) => services.run(input, hooks),
    )
    return recognitionJson(result, recognitionStatus(result))
  } catch (error) {
    if (error instanceof RecognitionInputError)
      return recognitionJson({ ok: false, code: error.code, message: error.message }, error.status)
    // The provider/persistence distinction is handled in executeRecognition.
    // This catch must not issue a refund or mark a saved result as failed.
    console.error('recognition-request-unavailable', {
      requestId: requestId && UUID.test(requestId) ? requestId : undefined,
    })
    return recognitionJson(
      {
        ok: false,
        code: 'recognition-unavailable',
        message:
          'The search status could not be read. Please keep the request ID and avoid repeated new searches.',
        requestId,
      },
      503,
    )
  }
}
export async function readRecognitionStatus(
  request: Request,
  db: BillingDb,
  user: { id: string } | undefined,
) {
  if (!user)
    return recognitionJson(
      { ok: false, code: 'auth-required', message: 'Sign in to check this search.' },
      401,
    )
  const requestId = new URL(request.url).searchParams.get('requestId') || ''
  if (!UUID.test(requestId))
    return recognitionJson(
      { ok: false, code: 'invalid-request', message: 'A valid request ID is required.' },
      400,
    )
  const attempt = await db
    .prepare('SELECT * FROM recognition_attempts WHERE user_id=? AND request_key=?')
    .bind(user.id, requestId.toLowerCase())
    .first<Attempt>()
  if (!attempt)
    return recognitionJson(
      { ok: false, code: 'invalid-request', message: 'Search not found.' },
      404,
    )
  const payload = await attemptResponse(db, attempt)
  return recognitionJson(payload, recognitionStatus(payload))
}
