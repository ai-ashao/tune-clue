#!/usr/bin/env node

const [, , baseUrlArg, ...urls] = process.argv
const token = process.env.TIKTOK_POC_TOKEN

if (!baseUrlArg || urls.length === 0 || !token) {
  console.error(
    'Usage: TIKTOK_POC_TOKEN=... node scripts/tiktok-poc-check.mjs https://tuneclue.com <tiktok-url> [more-urls...]',
  )
  process.exit(2)
}

const baseUrl = new URL(baseUrlArg)
const endpoint = new URL('/api/tiktok/poc', baseUrl)
const action = process.env.TIKTOK_POC_ACTION || 'probe'
const rows = []

for (const url of urls) {
  const started = Date.now()
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ url, action }),
    })

    const payload = await response.json().catch(() => null)
    rows.push({
      url,
      http: response.status,
      ok: Boolean(payload?.ok),
      source: payload?.resolved?.source,
      directAudio: payload?.capability?.directAudio,
      audioProbe: payload?.probes?.audio?.status,
      recognition: payload?.recognition?.status,
      code: payload?.code,
      ms: Date.now() - started,
    })
  } catch (error) {
    rows.push({
      url,
      http: 0,
      ok: false,
      code: error instanceof Error ? error.message : 'request-failed',
      ms: Date.now() - started,
    })
  }
}

console.table(rows)

const successes = rows.filter((row) => row.ok).length
const directAudio = rows.filter((row) => row.directAudio).length
const readableAudio = rows.filter(
  (row) => row.audioProbe && row.audioProbe >= 200 && row.audioProbe < 300,
).length

console.log(
  JSON.stringify(
    {
      action,
      total: rows.length,
      successes,
      directAudio,
      readableAudio,
      successRate: rows.length ? successes / rows.length : 0,
      directAudioRate: rows.length ? directAudio / rows.length : 0,
      readableAudioRate: rows.length ? readableAudio / rows.length : 0,
    },
    null,
    2,
  ),
)
