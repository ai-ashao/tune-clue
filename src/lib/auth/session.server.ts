import type { SharePlatform } from '@/lib/credits/share-tasks'
import { getTuneClueDb } from '@/lib/db.server'
import { readCookie, SESSION_COOKIE } from './cookies.server'
import { randomUrlSafeToken, sha256Base64Url } from './crypto'
import type { AuthUser } from './types'

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

type SessionUser = AuthUser & {
  credits: number
  shareRewards: SharePlatform[]
}

type GoogleProfileInput = {
  sub: string
  email: string
  name?: string
  picture?: string
}

export async function createOrUpdateGoogleUser(profile: GoogleProfileInput) {
  const db = await getTuneClueDb()
  const now = Date.now()
  const existing = await db
    .prepare('SELECT id, email, name FROM users WHERE google_sub = ?')
    .bind(profile.sub)
    .first<{ id: string; email: string; name: string | null }>()

  if (existing) {
    await db
      .prepare(
        `UPDATE users
         SET email = ?, name = ?, avatar_url = ?, updated_at = ?
         WHERE id = ?`,
      )
      .bind(profile.email, profile.name || null, profile.picture || null, now, existing.id)
      .run()

    return { id: existing.id, email: profile.email, name: profile.name, isNew: false }
  }

  const userId = crypto.randomUUID()
  const welcomeTransactionId = crypto.randomUUID()

  try {
    await db.batch([
      db
        .prepare(
          `INSERT INTO users
           (id, google_sub, email, name, avatar_url, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          userId,
          profile.sub,
          profile.email,
          profile.name || null,
          profile.picture || null,
          now,
          now,
        ),
      db
        .prepare(
          `INSERT INTO credit_transactions
           (id, user_id, delta, type, reference_id, idempotency_key, created_at)
           VALUES (?, ?, 1, 'welcome_bonus', NULL, ?, ?)`,
        )
        .bind(welcomeTransactionId, userId, `welcome:${userId}`, now),
    ])

    return { id: userId, email: profile.email, name: profile.name, isNew: true }
  } catch {
    const raced = await db
      .prepare('SELECT id, email, name FROM users WHERE google_sub = ?')
      .bind(profile.sub)
      .first<{ id: string; email: string; name: string | null }>()
    if (!raced) throw new Error('Could not create the Google account.')
    return { id: raced.id, email: raced.email, name: raced.name || undefined, isNew: false }
  }
}

export async function createSession(userId: string) {
  const db = await getTuneClueDb()
  const token = randomUrlSafeToken(32)
  const tokenHash = await sha256Base64Url(token)
  const now = Date.now()
  const expiresAt = now + SESSION_TTL_MS

  await db
    .prepare(
      `INSERT INTO sessions
       (token_hash, user_id, created_at, expires_at)
       VALUES (?, ?, ?, ?)`,
    )
    .bind(tokenHash, userId, now, expiresAt)
    .run()

  return { token, expiresAt }
}

export async function destroySession(request: Request) {
  const token = readCookie(request, SESSION_COOKIE)
  if (!token) return
  const db = await getTuneClueDb()
  const tokenHash = await sha256Base64Url(token)
  await db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run()
}

export async function getCurrentSessionUser(request: Request): Promise<SessionUser | undefined> {
  const token = readCookie(request, SESSION_COOKIE)
  if (!token) return undefined

  const db = await getTuneClueDb()
  const tokenHash = await sha256Base64Url(token)
  const now = Date.now()
  const row = await db
    .prepare(
      `SELECT
         u.id,
         u.email,
         u.name,
         COALESCE(
           (SELECT SUM(delta) FROM credit_transactions c WHERE c.user_id = u.id),
           0
         ) AS credits
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ?`,
    )
    .bind(tokenHash, now)
    .first<{ id: string; email: string; name: string | null; credits: number }>()

  if (!row) return undefined

  const rewardRows = await db
    .prepare('SELECT platform FROM share_rewards WHERE user_id = ? ORDER BY claimed_at ASC')
    .bind(row.id)
    .all<{ platform: SharePlatform }>()

  return {
    id: row.id,
    email: row.email,
    name: row.name || undefined,
    credits: Number(row.credits || 0),
    shareRewards: rewardRows.results.map((item) => item.platform),
  }
}
