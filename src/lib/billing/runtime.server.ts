import { getCurrentSessionUser } from '@/lib/auth/session.server'
import { getTuneClueDb } from '@/lib/db.server'
import { parseBillingConfig } from './config'
import { DodoProvider } from './dodo'
import { BillingError } from './types'

export async function billingConfig() {
  const { env } = await import('cloudflare:workers')
  return parseBillingConfig(env as unknown as Record<string, unknown>)
}

export async function billingContext() {
  const config = await billingConfig()
  return { db: await getTuneClueDb(), config, provider: new DodoProvider(config) }
}

export async function billingUser(request: Request) {
  const user = await getCurrentSessionUser(request)
  if (!user) throw new BillingError('auth-required', 'Sign in with Google to continue.', 401)
  return user
}
