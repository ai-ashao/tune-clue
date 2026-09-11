import { AdminError } from './types'

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const ID = /^[A-Za-z0-9_-]{1,128}$/
export function id(value: unknown): string {
  if (typeof value !== 'string' || !ID.test(value)) throw new AdminError('invalid_id', 400)
  return value
}
export function exactObject(value: unknown, keys: readonly string[]) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new AdminError('invalid_request', 400)
  const result = value as Record<string, unknown>
  if (Object.keys(result).some((key) => !keys.includes(key)))
    throw new AdminError('unexpected_field', 400)
  return result
}
export function requireAdminOrigin(request: Request, origin: string) {
  if (
    request.headers.get('origin') !== origin ||
    request.headers.get('x-tuneclue-admin-action') !== '1'
  ) {
    throw new AdminError('invalid_origin', 403)
  }
  const site = request.headers.get('sec-fetch-site')
  if (site && site !== 'same-origin' && site !== 'none') throw new AdminError('invalid_origin', 403)
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') || '')) {
    throw new AdminError('json_required', 415)
  }
}
export async function readAdminJson(request: Request): Promise<unknown> {
  if (Number(request.headers.get('content-length') || '0') > 8192)
    throw new AdminError('body_too_large', 413)
  if (!request.body) throw new AdminError('invalid_request', 400)
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const item = await reader.read()
      if (item.done) break
      size += item.value.byteLength
      if (size > 8192) {
        await reader.cancel()
        throw new AdminError('body_too_large', 413)
      }
      chunks.push(item.value)
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
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
  } catch {
    throw new AdminError('invalid_json', 400)
  }
}
export const adminHeaders = {
  'cache-control': 'private, no-store',
  'x-robots-tag': 'noindex, nofollow',
  'referrer-policy': 'no-referrer',
  'x-content-type-options': 'nosniff',
  vary: 'Cookie',
}
export function adminJson(data: unknown, traceId: string, status = 200) {
  return Response.json(
    { ok: true, data, traceId, dataAsOf: Date.now() },
    { status, headers: adminHeaders },
  )
}
export function adminFailure(error: unknown, traceId: string) {
  const known = error instanceof AdminError
  const code = known ? error.code : 'admin_service_unavailable'
  const headers: Record<string, string> = { ...adminHeaders }
  if (known && error.retryAfter) headers['retry-after'] = String(error.retryAfter)
  // Never send upstream payloads, SQL, credentials, or stack traces to the browser.
  return Response.json(
    { ok: false, code, traceId },
    { status: known ? error.status : 503, headers },
  )
}
export async function digest(value: string | ArrayBuffer) {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (v) =>
    v.toString(16).padStart(2, '0'),
  ).join('')
}
