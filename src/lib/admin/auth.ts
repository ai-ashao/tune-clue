import type { BillingDb } from '../billing/types'
import { type AdminConfig, AdminError, type AdminIdentity } from './types'

// Same cookie and SHA-256/base64url format as TuneClue's existing Google session service.
// This query adds the admin-only age constraint without changing public 30-day sessions.
export async function authorizeAdmin(
  request: Request,
  db: BillingDb,
  config: AdminConfig,
  now = Date.now(),
): Promise<AdminIdentity> {
  if (!config.enabled) throw new AdminError('admin_disabled', 404)
  const raw = request.headers.get('cookie') || ''
  let token: string | undefined
  try {
    token = raw
      .split(';')
      .map((part) => part.trim())
      .filter((part) => part.startsWith('tuneclue_session='))
      .map((part) => decodeURIComponent(part.slice('tuneclue_session='.length)))[0]
  } catch {
    throw new AdminError('auth_required', 401)
  }
  if (!token || token.length > 512) throw new AdminError('auth_required', 401)
  const bytes = new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)),
  )
  const hash = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  const row = await db
    .prepare(`SELECT u.id, u.email, u.name, s.created_at AS sessionCreatedAt
    FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?`)
    .bind(hash, now)
    .first<AdminIdentity>()
  if (!row) throw new AdminError('auth_required', 401)
  if (!config.userIds.includes(row.id)) throw new AdminError('admin_forbidden', 403)
  if (row.sessionCreatedAt > now || now - row.sessionCreatedAt >= 8 * 60 * 60_000)
    throw new AdminError('admin_session_expired', 401)
  return row
}
