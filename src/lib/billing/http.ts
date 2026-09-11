import { BillingError } from './types'

export function billingJson(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' },
  })
}

export function requireSameOrigin(request: Request, siteUrl: string): void {
  if (
    request.headers.get('origin') !== new URL(siteUrl).origin ||
    request.headers.get('sec-fetch-site') === 'cross-site'
  ) {
    throw new BillingError('forbidden-origin', 'Refresh TuneClue and try again.', 403)
  }
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    throw new BillingError('invalid-content-type', 'Send a JSON request.', 415)
  }
}

export async function readBody(request: Request, limit = 4096): Promise<Uint8Array> {
  const declared = Number(request.headers.get('content-length'))
  if (declared > limit) throw new BillingError('body-too-large', 'Request too large.', 413)
  if (!request.body) return new Uint8Array()
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      if (!value) continue
      length += value.byteLength
      if (length > limit) {
        await reader.cancel()
        throw new BillingError('body-too-large', 'Request too large.', 413)
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const result = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.byteLength
  }
  return result
}

export async function readJson(request: Request): Promise<unknown> {
  const raw = await readBody(request)
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw))
  } catch {
    throw new BillingError('invalid-json', 'Send valid JSON.', 400)
  }
}

export function billingFailure(error: unknown): Response {
  if (error instanceof BillingError) {
    return billingJson({ ok: false, code: error.code, message: error.message }, error.status)
  }
  // No raw provider body, customer details, secrets, or media in logs/responses.
  console.error('TuneClue billing request failed', { code: 'internal-error' })
  return billingJson(
    {
      ok: false,
      code: 'billing-unavailable',
      message: 'Billing is temporarily unavailable. Check your order status before trying again.',
    },
    503,
  )
}
