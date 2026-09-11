import { BillingError, identifier, object } from './types'

function decodeBase64(value: string): Uint8Array {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length % 4 === 1) {
    throw new BillingError('invalid-signature', 'Invalid webhook signature.', 401)
  }
  try {
    return Uint8Array.from(atob(value), (char) => char.charCodeAt(0))
  } catch {
    throw new BillingError('invalid-signature', 'Invalid webhook signature.', 401)
  }
}

export type VerifiedWebhook = {
  id: string
  type: string
  occurredAt: number
  data: Record<string, unknown>
}

// Standard Webhooks v1: HMAC-SHA256(id.timestamp.EXACT_RAW_BODY).
// Web Crypto verifies the MAC without a timing-sensitive string comparison.
export async function verifyWebhook(
  raw: Uint8Array,
  headers: Headers,
  secret: string,
  businessId: string,
  now = Date.now(),
): Promise<VerifiedWebhook> {
  const id = headers.get('webhook-id') || ''
  const timestamp = headers.get('webhook-timestamp') || ''
  const signatures = headers.get('webhook-signature') || ''
  if (
    !/^[A-Za-z0-9_-]{1,128}$/.test(id) ||
    !/^\d{1,12}$/.test(timestamp) ||
    !signatures ||
    signatures.length > 4096 ||
    !secret ||
    !businessId
  ) {
    throw new BillingError('invalid-signature', 'Missing or invalid webhook headers.', 401)
  }
  if (Math.abs(now / 1000 - Number(timestamp)) > 300) {
    throw new BillingError(
      'invalid-signature',
      'Webhook timestamp is outside the permitted window.',
      401,
    )
  }
  const keyBytes = decodeBase64(secret.startsWith('whsec_') ? secret.slice(6) : secret)
  if (keyBytes.byteLength < 16)
    throw new BillingError('billing-config', 'Invalid webhook key.', 503)
  const key = await crypto.subtle.importKey(
    'raw',
    new Uint8Array(keyBytes).buffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  )
  const prefix = new TextEncoder().encode(`${id}.${timestamp}.`)
  const signed = new Uint8Array(prefix.byteLength + raw.byteLength)
  signed.set(prefix)
  signed.set(raw, prefix.byteLength)
  let valid = false
  for (const entry of signatures.split(/\s+/)) {
    const [version, encoded] = entry.split(',')
    if (version !== 'v1' || !encoded) continue
    try {
      if (
        await crypto.subtle.verify(
          'HMAC',
          key,
          new Uint8Array(decodeBase64(encoded)).buffer,
          signed.buffer,
        )
      )
        valid = true
    } catch {
      // A bad/old signature must not hide a valid signature during key rotation.
    }
  }
  if (!valid) throw new BillingError('invalid-signature', 'Invalid webhook signature.', 401)
  let event: Record<string, unknown>
  try {
    event = object(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw)))
  } catch {
    throw new BillingError('invalid-payload', 'Invalid webhook body.', 400)
  }
  if (event.business_id !== businessId) {
    throw new BillingError('wrong-business', 'Webhook business does not match.', 403)
  }
  const occurredAt = typeof event.timestamp === 'string' ? Date.parse(event.timestamp) : Number.NaN
  if (!Number.isFinite(occurredAt) || typeof event.type !== 'string' || event.type.length > 100) {
    throw new BillingError('invalid-payload', 'Invalid webhook event.', 400)
  }
  return { id: identifier(id), type: event.type, occurredAt, data: object(event.data) }
}
