import assert from 'node:assert/strict'
import test from 'node:test'
import { action, attempt, balance, credit, mod, other, setup, user } from './helpers.mjs'

const { beginAttempt, executeRecognition, findAttempt, persistResult, RecognitionFailure } =
  await mod('recognition/attempts')
const { adminReturnCredit } = await mod('admin/actions')
const { returnAutomaticCredit } = await mod('recognition/safe-refund')
const { handleRecognition, readRecognitionStatus } = await mod('recognition/request-handler')
const good = { status: 'matched', title: 'Fixture song', artist: 'Fixture artist', links: {} }
const input = (overrides = {}) => ({
  userId: user.id,
  requestId: crypto.randomUUID(),
  source: 'local_file',
  fingerprint: 'same_input',
  ...overrides,
})
for (const source of ['local_file', 'tiktok_url']) {
  test(`${source}: normal result records one debit and provider attempt`, async (t) => {
    const c = await setup()
    t.after(() => c.db.close())
    await credit(c.db)
    const res = await executeRecognition(c.db, input({ source }), async (h) => {
      await h.beforeProvider()
      return good
    })
    assert.equal(res.ok, true)
    const a = await findAttempt(c.db, res.attemptId)
    assert.equal(a.status, 'matched')
    assert.equal(a.provider_call_count, 1)
    assert.equal(await balance(c.db), 0)
  })
}
test('normal no-match consumes one credit and cannot be manually returned', async (t) => {
  const c = await setup()
  t.after(() => c.db.close())
  await credit(c.db)
  const res = await executeRecognition(c.db, input(), async (h) => {
    await h.beforeProvider()
    return { status: 'no-match' }
  })
  assert.equal(res.ok, true)
  assert.equal(await balance(c.db), 0)
  const returned = await adminReturnCredit(c, res.attemptId, action())
  assert.equal(returned.outcome, 'not_eligible')
  assert.equal(await balance(c.db), 0)
})
test('known source failure before AudD returns credit without inventing provider call', async (t) => {
  const c = await setup()
  t.after(() => c.db.close())
  await credit(c.db)
  const res = await executeRecognition(c.db, input(), async () => {
    throw new RecognitionFailure('source-unavailable', true)
  })
  const a = await findAttempt(c.db, res.attemptId)
  assert.equal(a.status, 'system_error')
  assert.equal(a.provider_call_count, 0)
  assert.equal(a.resolution, 'auto_credit_return')
  assert.equal(await balance(c.db), 1)
})
test('missing provider configuration is definite failure with returned credit', async (t) => {
  const c = await setup()
  t.after(() => c.db.close())
  await credit(c.db)
  const res = await executeRecognition(c.db, input(), async () => {
    throw new RecognitionFailure('provider-not-configured')
  })
  assert.equal(res.code, 'provider-not-configured')
  assert.equal(await balance(c.db), 1)
})
test('unknown transport failure retains uncertain status and debit for review', async (t) => {
  const c = await setup()
  t.after(() => c.db.close())
  await credit(c.db)
  const res = await executeRecognition(c.db, input(), async (h) => {
    await h.beforeProvider()
    throw new Error('unknown transport')
  })
  assert.equal(res.code, 'result-unknown')
  assert.equal((await findAttempt(c.db, res.attemptId)).status, 'indeterminate')
  assert.equal(await balance(c.db), 0)
  const ret = await adminReturnCredit(
    c,
    res.attemptId,
    action('unresolved_timeout', { confirmedUnresolved: true }),
  )
  assert.equal(ret.outcome, 'not_eligible')
})
test('same request ID concurrent arrivals have one executor, one debit and no second provider call', async (t) => {
  const c = await setup()
  t.after(() => c.db.close())
  await credit(c.db, user.id, 5)
  const i = input()
  let calls = 0
  let release
  const gate = new Promise((resolve) => {
    release = resolve
  })
  const runner = async (h) => {
    calls++
    await h.beforeProvider()
    await gate
    return good
  }
  const first = executeRecognition(c.db, i, runner)
  await new Promise((r) => setTimeout(r, 10))
  const second = await executeRecognition(c.db, i, runner)
  assert.equal(second.code, 'in-progress')
  release()
  const done = await first
  assert.equal(done.ok, true)
  assert.equal(calls, 1)
  assert.equal(await balance(c.db), 4)
  const replay = await executeRecognition(c.db, i, runner)
  assert.equal(replay.ok, true)
  assert.equal(calls, 1)
})
test('same request ID with altered input is rejected without charging', async (t) => {
  const c = await setup()
  t.after(() => c.db.close())
  await credit(c.db, user.id, 2)
  const i = input()
  await executeRecognition(c.db, i, async () => good)
  const res = await executeRecognition(c.db, { ...i, fingerprint: 'other' }, async () => {
    throw Error('must not execute')
  })
  assert.equal(res.code, 'request-conflict')
  assert.equal(await balance(c.db), 1)
})
test('two distinct requests cannot overdraw a one-credit balance', async (t) => {
  const c = await setup()
  t.after(() => c.db.close())
  await credit(c.db)
  const [a, b] = await Promise.all([beginAttempt(c.db, input()), beginAttempt(c.db, input())])
  assert.equal([a, b].filter((x) => x.owner).length, 1)
  assert.equal([a, b].filter((x) => x.attempt.status === 'rejected').length, 1)
  assert.equal(await balance(c.db), 0)
})
test('reservation and debit fail atomically if attempt state update fails', async (t) => {
  const c = await setup()
  t.after(() => c.db.close())
  await credit(c.db)
  c.db.failAt = 2
  await assert.rejects(() => beginAttempt(c.db, input()))
  c.db.failAt = -1
  assert.equal(await balance(c.db), 1)
  assert.equal((await c.db.prepare('SELECT COUNT(*) n FROM recognition_attempts').first()).n, 0)
})
test('expired result replay never becomes a new purchase-consuming request', async (t) => {
  const c = await setup()
  t.after(() => c.db.close())
  await credit(c.db, user.id, 2)
  const i = input()
  let calls = 0
  const r = await executeRecognition(c.db, i, async () => {
    calls++
    return good
  })
  await c.db
    .prepare('UPDATE recognition_attempts SET result_expires_at=? WHERE id=?')
    .bind(Date.now() - 1, r.attemptId)
    .run()
  const replay = await executeRecognition(c.db, i, async () => {
    calls++
    return good
  })
  assert.equal(replay.code, 'result-expired')
  assert.equal(calls, 1)
  assert.equal(await balance(c.db), 1)
})
test('rejected ID stays rejected after top-up; a newly explicit request can run', async (t) => {
  const c = await setup()
  t.after(() => c.db.close())
  const i = input()
  const first = await executeRecognition(c.db, i, async () => good)
  assert.equal(first.code, 'insufficient-credits')
  await credit(c.db)
  const retry = await executeRecognition(c.db, i, async () => {
    throw Error('must not run')
  })
  assert.equal(retry.code, 'insufficient-credits')
  assert.equal(await balance(c.db), 1)
  assert.equal((await executeRecognition(c.db, input(), async () => good)).ok, true)
})
test('persisted successful result is not automatically refunded by later balance response failure', async (t) => {
  const c = await setup()
  t.after(() => c.db.close())
  await credit(c.db)
  const prepare = c.db.prepare.bind(c.db)
  let fail = true
  function wrapped(statement, sql) {
    const bind = statement.bind.bind(statement)
    statement.bind = (...values) => wrapped(bind(...values), sql)
    if (sql.includes('AS balance FROM credit_transactions'))
      statement.first = async () => {
        if (fail) throw Error('response lookup failure')
        return { balance: 0 }
      }
    return statement
  }
  c.db.prepare = (sql) => wrapped(prepare(sql), sql)
  await assert.rejects(
    () => executeRecognition(c.db, input(), async () => good),
    /response lookup failure/,
  )
  fail = false
  const a = await c.db.prepare('SELECT status FROM recognition_attempts').first()
  assert.equal(a.status, 'matched')
  assert.equal(await balance(c.db), 0)
  assert.equal(
    (await c.db.prepare("SELECT COUNT(*) n FROM credit_transactions WHERE type='refund'").first())
      .n,
    0,
  )
})
test('known failure whose return transaction fails remains traceable and eligible later', async (t) => {
  const c = await setup()
  t.after(() => c.db.close())
  await credit(c.db)
  const r = await executeRecognition(c.db, input(), async () => {
    c.db.failSql = 'SELECT ?,a.user_id,-d.delta'
    throw new RecognitionFailure('provider-error')
  })
  c.db.failSql = null
  assert.equal((await findAttempt(c.db, r.attemptId)).status, 'system_error')
  assert.equal(await balance(c.db), 0)
  assert.equal((await adminReturnCredit(c, r.attemptId, action())).outcome, 'returned')
})
test('manual and automatic return race writes exactly one shared refund key', async (t) => {
  const c = await setup()
  t.after(() => c.db.close())
  await credit(c.db)
  const a = await attempt(c.db)
  await Promise.all([
    adminReturnCredit(c, a.id, action()),
    returnAutomaticCredit(c.db, user.id, a.id),
  ])
  assert.equal(await balance(c.db), 1)
  assert.equal(
    (
      await c.db
        .prepare('SELECT COUNT(*) n FROM credit_transactions WHERE idempotency_key=?')
        .bind(`refund:${a.id}`)
        .first()
    ).n,
    1,
  )
})
test('two administrators requests for one failed attempt never return twice', async (t) => {
  const c = await setup()
  t.after(() => c.db.close())
  await credit(c.db)
  const a = await attempt(c.db)
  const res = await Promise.all([
    adminReturnCredit(c, a.id, action()),
    adminReturnCredit(c, a.id, action()),
  ])
  assert.equal(res.filter((r) => r.outcome === 'returned').length, 1)
  assert.equal(await balance(c.db), 1)
})
test('repeat same operation ID restores its committed result without mutating balance', async (t) => {
  const c = await setup()
  t.after(() => c.db.close())
  await credit(c.db)
  const a = await attempt(c.db)
  const payload = action()
  const first = await adminReturnCredit(c, a.id, payload)
  const second = await adminReturnCredit(c, a.id, payload)
  assert.deepEqual(second, first)
  assert.equal(await balance(c.db), 1)
})
for (const status of ['matched', 'no_match', 'running', 'rejected']) {
  test(`manual failure return cannot override ${status}`, async (t) => {
    const c = await setup()
    t.after(() => c.db.close())
    await credit(c.db)
    const a = await attempt(c.db, status)
    const r = await adminReturnCredit(c, a.id, action())
    assert.equal(r.outcome, 'not_eligible')
    assert.equal(await balance(c.db), 0)
  })
}
test('unknown result compensation requires both deadline and fifteen-minute boundary', async (t) => {
  const now = Date.now()
  const c = await setup()
  t.after(() => c.db.close())
  await credit(c.db, user.id, 3)
  for (const age of [899999, 900000]) {
    const a = await attempt(c.db, 'indeterminate', now - age)
    const r = await adminReturnCredit(
      c,
      a.id,
      action('unresolved_timeout', { confirmedUnresolved: true }),
      now,
    )
    assert.equal(r.outcome, age < 900000 ? 'not_eligible' : 'returned')
  }
  const a = await attempt(c.db, 'indeterminate', now - 1000000)
  await c.db
    .prepare('UPDATE recognition_attempts SET execution_deadline_at=? WHERE id=?')
    .bind(now + 1, a.id)
    .run()
  const r = await adminReturnCredit(
    c,
    a.id,
    action('unresolved_timeout', { confirmedUnresolved: true }),
    now,
  )
  assert.equal(r.outcome, 'not_eligible')
})
test('unknown compensation preserves unknown and a very late result never recharges', async (t) => {
  const c = await setup()
  t.after(() => c.db.close())
  await credit(c.db)
  const a = await attempt(c.db, 'running', Date.now() - 1000000)
  assert.equal(
    (await adminReturnCredit(c, a.id, action('unresolved_timeout', { confirmedUnresolved: true })))
      .outcome,
    'returned',
  )
  assert.equal((await findAttempt(c.db, a.id)).status, 'indeterminate')
  assert.equal(await persistResult(c.db, a, good), false)
  assert.equal(await balance(c.db), 1)
})
test('request with another account debit cannot be refunded to the wrong account', async (t) => {
  const c = await setup()
  t.after(() => c.db.close())
  await credit(c.db)
  const a = await attempt(c.db)
  await c.db
    .prepare('UPDATE credit_transactions SET user_id=? WHERE idempotency_key=?')
    .bind(other.id, `recognition:${a.id}`)
    .run()
  assert.equal((await adminReturnCredit(c, a.id, action())).outcome, 'not_eligible')
  assert.equal(
    (await c.db.prepare("SELECT COUNT(*) n FROM credit_transactions WHERE type='refund'").first())
      .n,
    0,
  )
})
test('missing historical attempt cannot be fabricated from a ledger debit', async (t) => {
  const c = await setup()
  t.after(() => c.db.close())
  await c.db
    .prepare(
      "INSERT INTO credit_transactions VALUES ('legacy',?,-1,'recognition','legacy','recognition:legacy',?)",
    )
    .bind(user.id, Date.now())
    .run()
  await assert.rejects(
    () => adminReturnCredit(c, 'legacy', action()),
    (e) => e.status === 404,
  )
})
test('manual refund and terminal audit are one rollback unit', async (t) => {
  const c = await setup()
  t.after(() => c.db.close())
  await credit(c.db)
  const a = await attempt(c.db)
  c.db.failSql = 'SELECT ?,o.id,o.admin_user_id,o.state'
  await assert.rejects(() => adminReturnCredit(c, a.id, action()))
  c.db.failSql = null
  assert.equal(await balance(c.db), 0)
  assert.equal((await findAttempt(c.db, a.id)).resolution, null)
  assert.equal(
    (
      await c.db
        .prepare("SELECT COUNT(*) n FROM admin_audit_logs WHERE event_kind!='started'")
        .first()
    ).n,
    0,
  )
})
test('exceptional credit return restores just one credit on an already negative account', async (t) => {
  const c = await setup()
  t.after(() => c.db.close())
  await credit(c.db)
  const a = await attempt(c.db)
  await credit(c.db, user.id, -8)
  assert.equal((await adminReturnCredit(c, a.id, action())).currentBalance, -7)
})
test('public status endpoint only reads the requesting owner and never calls provider', async (t) => {
  const c = await setup()
  t.after(() => c.db.close())
  await credit(c.db)
  const i = input()
  await executeRecognition(c.db, i, async () => good)
  const req = new Request(`https://tuneclue.com/api/recognition/status?requestId=${i.requestId}`)
  const no = await readRecognitionStatus(req, c.db, other)
  assert.equal(no.status, 404)
  const yes = await readRecognitionStatus(req, c.db, user)
  assert.equal((await yes.json()).ok, true)
})
test('unauthenticated public request is rejected before parsing media', async (t) => {
  const c = await setup()
  t.after(() => c.db.close())
  let parsed = 0
  const r = await handleRecognition(
    new Request('https://tuneclue.com/api/recognize', { method: 'POST' }),
    {
      db: c.db,
      user: async () => undefined,
      parse: async () => {
        parsed++
        throw Error()
      },
      run: async () => good,
    },
  )
  assert.equal(r.status, 401)
  assert.equal(parsed, 0)
})
test('stable request key is scoped to user instead of globally consuming another user credit', async (t) => {
  const c = await setup()
  t.after(() => c.db.close())
  await credit(c.db)
  await credit(c.db, other.id)
  const i = input()
  await executeRecognition(c.db, i, async () => good)
  const b = await executeRecognition(c.db, { ...i, userId: other.id }, async () => good)
  assert.equal(b.ok, true)
})
