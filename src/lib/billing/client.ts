import { BillingError } from './types'

export async function billingRequest<T>(
  path: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: {
      accept: 'application/json',
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  })
  const data: unknown = await response.json().catch(() => null)
  if (!response.ok || !data || typeof data !== 'object') {
    const failure = data as { code?: string; message?: string } | null
    throw new BillingError(
      failure?.code || 'billing-unavailable',
      failure?.message || 'Billing is temporarily unavailable. Try again shortly.',
      response.status,
    )
  }
  return data as T
}

export function money(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount / 100)
}
