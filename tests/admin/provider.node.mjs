import assert from 'node:assert/strict'
import test from 'node:test'
import { mod } from './helpers.mjs'

const { recognizeWithAudD } = await mod('recognition/audd.server')
const sample = new File(['RIFFmockaudioWAVE'], 'sample.wav', { type: 'audio/wav' })
function execution() {
  return {
    token: 'fixture-only-key',
    signal: new AbortController().signal,
    beforeProvider: async () => {},
  }
}
function useFetch(t, fn) {
  const old = globalThis.fetch
  globalThis.fetch = fn
  t.after(() => {
    globalThis.fetch = old
  })
}
test('actual AudD adapter sends only after persisted send marker and uses passed server key', async (t) => {
  const steps = []
  useFetch(t, async (url, init) => {
    steps.push('fetch')
    assert.equal(url, 'https://api.audd.io/')
    assert.equal(init.body.get('api_token'), 'fixture-only-key')
    assert.ok(init.signal)
    return Response.json({
      status: 'success',
      result: { artist: 'Fixture artist', title: 'Fixture song' },
    })
  })
  const r = await recognizeWithAudD(sample, {
    ...execution(),
    beforeProvider: async () => {
      steps.push('persist')
    },
  })
  assert.deepEqual(steps, ['persist', 'fetch'])
  assert.equal(r.status, 'matched')
})
test('actual AudD no-match normalization is an ordinary completed result', async (t) => {
  useFetch(t, async () => Response.json({ status: 'success', result: null }))
  assert.deepEqual(await recognizeWithAudD(sample, execution()), { status: 'no-match' })
})
test('missing key fails before marker or external fetch', async (t) => {
  useFetch(t, async () => {
    throw Error('must not fetch')
  })
  const old = process.env.AUDD_API_TOKEN
  delete process.env.AUDD_API_TOKEN
  t.after(() => {
    if (old === undefined) delete process.env.AUDD_API_TOKEN
    else process.env.AUDD_API_TOKEN = old
  })
  let marked = 0
  await assert.rejects(
    () =>
      recognizeWithAudD(sample, {
        signal: execution().signal,
        beforeProvider: async () => {
          marked++
        },
      }),
    (e) => e.code === 'provider-not-configured' && e.definite === true,
  )
  assert.equal(marked, 0)
})
test('failed persistent marker prevents any upstream request', async (t) => {
  let sends = 0
  useFetch(t, async () => {
    sends++
    return Response.json({ status: 'success' })
  })
  await assert.rejects(() =>
    recognizeWithAudD(sample, {
      ...execution(),
      beforeProvider: async () => {
        throw Error('database unavailable')
      },
    }),
  )
  assert.equal(sends, 0)
})
test('already-aborted execution cannot send upstream', async (t) => {
  let sends = 0
  useFetch(t, async () => {
    sends++
    return Response.json({ status: 'success' })
  })
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(() =>
    recognizeWithAudD(sample, { ...execution(), signal: controller.signal }),
  )
  assert.equal(sends, 0)
})
test('HTTP provider failure is distinct from unknown transport', async (t) => {
  useFetch(t, async () => new Response('failure', { status: 503 }))
  await assert.rejects(
    () => recognizeWithAudD(sample, execution()),
    (e) => e.code === 'provider-error' && e.definite === true,
  )
  globalThis.fetch = async () => {
    throw new TypeError('network unknown')
  }
  await assert.rejects(
    () => recognizeWithAudD(sample, execution()),
    (e) => e.definite === false,
  )
})
test('malformed provider response is sanitized and does not leak upstream messages', async (t) => {
  useFetch(t, async () =>
    Response.json({ status: 'error', error: { error_message: 'secret provider details' } }),
  )
  await assert.rejects(
    () => recognizeWithAudD(sample, execution()),
    (e) => e.message === 'provider-error' && !e.message.includes('secret'),
  )
})
test('unknown response stream failure is not mislabeled as known failure', async (t) => {
  useFetch(t, async () => ({
    ok: true,
    json: async () => {
      throw new TypeError('stream interrupted')
    },
  }))
  await assert.rejects(
    () => recognizeWithAudD(sample, execution()),
    (e) => e.definite === false,
  )
})
