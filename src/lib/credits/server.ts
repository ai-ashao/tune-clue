import { getTuneClueDb } from '@/lib/db.server'
import type { SharePlatform } from './share-tasks'

export async function getCreditBalance(userId: string) {
  const db = await getTuneClueDb()
  const row = await db
    .prepare(
      `SELECT COALESCE(SUM(delta), 0) AS balance
       FROM credit_transactions
       WHERE user_id = ?`,
    )
    .bind(userId)
    .first<{ balance: number }>()
  return Number(row?.balance || 0)
}

export async function reserveRecognitionCredit(userId: string, attemptId: string) {
  const db = await getTuneClueDb()
  const result = await db
    .prepare(
      `INSERT INTO credit_transactions
       (id, user_id, delta, type, reference_id, idempotency_key, created_at)
       SELECT ?, ?, -1, 'recognition', ?, ?, ?
       WHERE (
         SELECT COALESCE(SUM(delta), 0)
         FROM credit_transactions
         WHERE user_id = ?
       ) >= 1`,
    )
    .bind(crypto.randomUUID(), userId, attemptId, `recognition:${attemptId}`, Date.now(), userId)
    .run()
  return Number(result.meta.changes || 0) === 1
}

export async function refundRecognitionCredit(userId: string, attemptId: string) {
  const db = await getTuneClueDb()
  await db
    .prepare(
      `INSERT OR IGNORE INTO credit_transactions
       (id, user_id, delta, type, reference_id, idempotency_key, created_at)
       VALUES (?, ?, 1, 'refund', ?, ?, ?)`,
    )
    .bind(crypto.randomUUID(), userId, attemptId, `refund:${attemptId}`, Date.now())
    .run()
}

export async function grantShareReward(userId: string, platform: SharePlatform) {
  const db = await getTuneClueDb()
  const now = Date.now()
  const idempotencyKey = `share:${userId}:${platform}`

  try {
    await db.batch([
      db
        .prepare(
          `INSERT INTO share_rewards
           (user_id, platform, claimed_at)
           VALUES (?, ?, ?)`,
        )
        .bind(userId, platform, now),
      db
        .prepare(
          `INSERT INTO credit_transactions
           (id, user_id, delta, type, reference_id, idempotency_key, created_at)
           VALUES (?, ?, 1, 'share_bonus', ?, ?, ?)`,
        )
        .bind(crypto.randomUUID(), userId, platform, idempotencyKey, now),
    ])
    return { granted: true, balance: await getCreditBalance(userId) }
  } catch (error) {
    const existing = await db
      .prepare('SELECT platform FROM share_rewards WHERE user_id = ? AND platform = ?')
      .bind(userId, platform)
      .first<{ platform: string }>()
    if (existing) return { granted: false, balance: await getCreditBalance(userId) }
    throw error
  }
}
