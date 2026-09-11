import { digest, UUID } from '../admin/http'
import type { BillingDb } from '../billing/types'
import { returnAutomaticCredit } from './safe-refund'
import type { RecognitionApiResponse, RecognitionResult } from './types'

export type Attempt = {
  id: string
  user_id: string
  request_key: string
  source_kind: 'local_file' | 'tiktok_url'
  payload_fingerprint: string
  status: 'running' | 'matched' | 'no_match' | 'system_error' | 'indeterminate' | 'rejected'
  stage: string
  provider_call_count: number
  error_code: string | null
  result_json: string | null
  result_expires_at: number | null
  resolution: string | null
  created_at: number
  updated_at: number
  execution_deadline_at: number
  finished_at: number | null
  duration_ms: number | null
}
export type ExecutionHooks = { signal: AbortSignal; beforeProvider: () => Promise<void> }
export class RecognitionFailure extends Error {
  constructor(
    readonly code: 'source-unavailable' | 'provider-not-configured' | 'provider-error',
    readonly definite = true,
  ) {
    super(code)
    this.name = 'RecognitionFailure'
  }
}
export const ATTEMPT_TIMEOUT_MS = 120_000
export async function fingerprintSource(
  source: 'local_file' | 'tiktok_url',
  data: ArrayBuffer | string,
) {
  return digest(`${source}:${await digest(data)}`)
}
export async function findAttempt(db: BillingDb, id: string) {
  return db.prepare('SELECT * FROM recognition_attempts WHERE id=?').bind(id).first<Attempt>()
}
export async function beginAttempt(
  db: BillingDb,
  input: {
    userId: string
    requestId: string
    source: Attempt['source_kind']
    fingerprint: string
    unitCost?: number | null
  },
  now = Date.now(),
) {
  if (!UUID.test(input.requestId)) throw new Error('invalid-request-id')
  const attemptId = crypto.randomUUID()
  const requestKey = input.requestId.toLowerCase()
  // Both reservation and debit are in one transaction. Only the freshly inserted
  // server ID can execute; ON CONFLICT leaves every other invocation uncharged.
  await db.batch([
    db
      .prepare(`INSERT INTO recognition_attempts
      (id,user_id,request_key,source_kind,payload_fingerprint,status,stage,estimated_unit_cost_microusd,
       created_at,updated_at,execution_deadline_at)
      VALUES (?,?,?,?,?,'running','accepted',?,?,?,?) ON CONFLICT(user_id,request_key) DO NOTHING`)
      .bind(
        attemptId,
        input.userId,
        requestKey,
        input.source,
        input.fingerprint,
        input.unitCost ?? null,
        now,
        now,
        now + ATTEMPT_TIMEOUT_MS,
      ),
    db
      .prepare(`INSERT INTO credit_transactions(id,user_id,delta,type,reference_id,idempotency_key,created_at)
      SELECT ?,a.user_id,-1,'recognition',a.id,'recognition:'||a.id,? FROM recognition_attempts a
      WHERE a.id=? AND a.status='running' AND
        (SELECT COALESCE(SUM(delta),0) FROM credit_transactions WHERE user_id=a.user_id)>=1
      ON CONFLICT(idempotency_key) DO NOTHING`)
      .bind(crypto.randomUUID(), now, attemptId),
    db
      .prepare(`UPDATE recognition_attempts SET
      status=CASE WHEN EXISTS(SELECT 1 FROM credit_transactions WHERE idempotency_key='recognition:'||recognition_attempts.id AND user_id=recognition_attempts.user_id AND delta=-1) THEN 'running' ELSE 'rejected' END,
      stage=CASE WHEN EXISTS(SELECT 1 FROM credit_transactions WHERE idempotency_key='recognition:'||recognition_attempts.id) THEN 'charged' ELSE 'finished' END,
      error_code=CASE WHEN EXISTS(SELECT 1 FROM credit_transactions WHERE idempotency_key='recognition:'||recognition_attempts.id) THEN NULL ELSE 'insufficient-credits' END,
      finished_at=CASE WHEN EXISTS(SELECT 1 FROM credit_transactions WHERE idempotency_key='recognition:'||recognition_attempts.id) THEN NULL ELSE ? END
      WHERE id=?`)
      .bind(now, attemptId),
  ])
  const attempt = await db
    .prepare('SELECT * FROM recognition_attempts WHERE user_id=? AND request_key=?')
    .bind(input.userId, requestKey)
    .first<Attempt>()
  if (!attempt) throw new Error('attempt-not-persisted')
  if (attempt.payload_fingerprint !== input.fingerprint || attempt.source_kind !== input.source) {
    return { attempt, owner: false, conflict: true }
  }
  return {
    attempt,
    owner: attempt.id === attemptId && attempt.status === 'running',
    conflict: false,
  }
}
export async function markStage(
  db: BillingDb,
  attempt: Attempt,
  stage: 'source' | 'provider',
  now = Date.now(),
) {
  const result = await db
    .prepare(`UPDATE recognition_attempts SET stage=?,updated_at=?,
      provider_call_count=provider_call_count+? WHERE id=? AND status='running' AND resolution IS NULL AND execution_deadline_at>?`)
    .bind(stage, now, stage === 'provider' ? 1 : 0, attempt.id, now)
    .run()
  if (Number(result.meta.changes) !== 1) throw new RecognitionFailure('provider-error', false)
}
export async function persistResult(
  db: BillingDb,
  attempt: Attempt,
  result: RecognitionResult,
  now = Date.now(),
) {
  const encoded = JSON.stringify(result)
  if (new TextEncoder().encode(encoded).length > 16_384) throw new Error('result-too-large')
  const updated = await db
    .prepare(`UPDATE recognition_attempts SET status=?,stage='finished',result_json=?,
    result_expires_at=?,updated_at=?,finished_at=?,duration_ms=?,error_code=NULL
    WHERE id=? AND status='running' AND resolution IS NULL AND execution_deadline_at>?`)
    .bind(
      result.status === 'matched' ? 'matched' : 'no_match',
      encoded,
      now + 86_400_000,
      now,
      now,
      Math.max(0, now - attempt.created_at),
      attempt.id,
      now,
    )
    .run()
  return Number(updated.meta.changes) === 1
}
export async function markFailure(
  db: BillingDb,
  attempt: Attempt,
  code: string,
  definite: boolean,
  now = Date.now(),
) {
  const allowed = ['source-unavailable', 'provider-not-configured', 'provider-error']
  await db
    .prepare(`UPDATE recognition_attempts SET status=?,stage='finished',error_code=?,updated_at=?,finished_at=?,duration_ms=?
    WHERE id=? AND status='running' AND resolution IS NULL`)
    .bind(
      definite ? 'system_error' : 'indeterminate',
      allowed.includes(code) ? code : 'provider-error',
      now,
      now,
      Math.max(0, now - attempt.created_at),
      attempt.id,
    )
    .run()
}
export async function attemptResponse(
  db: BillingDb,
  attempt: Attempt,
  replayed = true,
  now = Date.now(),
): Promise<RecognitionApiResponse> {
  if (attempt.status === 'matched' || attempt.status === 'no_match') {
    if (!attempt.result_json || !attempt.result_expires_at || attempt.result_expires_at <= now) {
      return {
        ok: false,
        code: 'result-expired',
        message:
          'This request was already processed. Its result cache has expired; no additional credit was used.',
        attemptId: attempt.id,
      }
    }
    const row = await db
      .prepare('SELECT COALESCE(SUM(delta),0) AS balance FROM credit_transactions WHERE user_id=?')
      .bind(attempt.user_id)
      .first<{ balance: number }>()
    return {
      ok: true,
      result: JSON.parse(attempt.result_json) as RecognitionResult,
      remainingCredits: Number(row?.balance || 0),
      attemptId: attempt.id,
      replayed,
    }
  }
  if (attempt.status === 'rejected')
    return {
      ok: false,
      code: 'insufficient-credits',
      message: 'No recognition credits remain. Buy or earn credits, then start a new search.',
      attemptId: attempt.id,
    }
  if (attempt.status === 'running' && attempt.execution_deadline_at > now)
    return {
      ok: false,
      code: 'in-progress',
      message: 'This song search is still processing. No additional credit has been used.',
      attemptId: attempt.id,
    }
  if (attempt.status === 'system_error') {
    const refund = await db
      .prepare(
        "SELECT id FROM credit_transactions WHERE user_id=? AND idempotency_key=? AND type='refund' AND delta=1",
      )
      .bind(attempt.user_id, `refund:${attempt.id}`)
      .first<{ id: string }>()
    const code =
      attempt.error_code === 'source-unavailable'
        ? 'source-unavailable'
        : attempt.error_code === 'provider-not-configured'
          ? 'provider-not-configured'
          : 'provider-error'
    return {
      ok: false,
      code,
      message: refund
        ? 'Recognition could not complete. Your credit has been returned.'
        : 'Recognition could not complete. The credit return needs review; contact support with this request ID.',
      attemptId: attempt.id,
    }
  }
  return {
    ok: false,
    code: 'result-unknown',
    message:
      'The final result could not be confirmed. Do not repeatedly submit this search. Contact support with the request ID.',
    attemptId: attempt.id,
  }
}

export async function executeRecognition(
  db: BillingDb,
  input: Parameters<typeof beginAttempt>[1],
  runner: (hooks: ExecutionHooks) => Promise<RecognitionResult>,
): Promise<RecognitionApiResponse> {
  const start = await beginAttempt(db, input)
  if (start.conflict)
    return {
      ok: false,
      code: 'request-conflict',
      message: 'This request ID belongs to different media.',
      attemptId: start.attempt.id,
    }
  const attempt = start.attempt
  if (!start.owner) return attemptResponse(db, attempt)
  const controller = new AbortController()
  const timer = setTimeout(
    () => controller.abort(),
    Math.max(1, attempt.execution_deadline_at - Date.now()),
  )
  let onAbort: () => void = () => undefined
  const deadline = new Promise<never>((_, reject) => {
    onAbort = () => reject(new RecognitionFailure('provider-error', false))
    controller.signal.addEventListener('abort', onAbort, { once: true })
  })
  let result: RecognitionResult
  try {
    await markStage(db, attempt, 'source')
    result = await Promise.race([
      runner({
        signal: controller.signal,
        beforeProvider: async () => {
          controller.signal.throwIfAborted()
          await markStage(db, attempt, 'provider')
          controller.signal.throwIfAborted()
        },
      }),
      deadline,
    ])
  } catch (error) {
    const definite =
      error instanceof RecognitionFailure && error.definite && !controller.signal.aborted
    const code = error instanceof RecognitionFailure ? error.code : 'provider-error'
    await markFailure(db, attempt, code, definite).catch(() => undefined)
    if (definite)
      await returnAutomaticCredit(db, attempt.user_id, attempt.id).catch(() => {
        console.error('recognition-credit-return-pending', { attemptId: attempt.id })
      })
    return attemptResponse(db, (await findAttempt(db, attempt.id)) || attempt, false)
  } finally {
    clearTimeout(timer)
    controller.signal.removeEventListener('abort', onAbort)
  }
  // Keep persistence/response failures OUTSIDE the provider failure handler.
  // A successfully persisted no_match/matched result must not be refunded just
  // because the subsequent balance lookup or network response fails.
  try {
    const saved = await persistResult(db, attempt, result)
    if (!saved) await markFailure(db, attempt, 'provider-error', false)
  } catch {
    await markFailure(db, attempt, 'provider-error', false).catch(() => undefined)
  }
  return attemptResponse(db, (await findAttempt(db, attempt.id)) || attempt, false)
}
