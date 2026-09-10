import { createFileRoute } from '@tanstack/react-router'
import { getCurrentSessionUser } from '@/lib/auth/session.server'
import {
  getCreditBalance,
  refundRecognitionCredit,
  reserveRecognitionCredit,
} from '@/lib/credits/server'
import { DatabaseConfigurationError } from '@/lib/db.server'
import { AudDConfigurationError } from '@/lib/recognition/audd.server'
import type { RecognitionApiResponse } from '@/lib/recognition/types'
import { FixedWindowRateLimiter, requestIdentity } from '@/lib/security/rate-limit'
import { TikTokFetchError } from '@/lib/tiktok/fetch.server'
import { runTikTokPoc, TikTokResolveError } from '@/lib/tiktok/resolve.server'
import { normalizeTikTokInputUrl, TikTokUrlPolicyError } from '@/lib/tiktok/url-policy'
import { tuneClueFlags } from '@/lib/tuneclue-flags'

const limiter = new FixedWindowRateLimiter(10, 60 * 60 * 1000)
const MAX_JSON_BYTES = 4 * 1024

type TikTokRecognitionRequest = { url?: unknown }

function json(data: RecognitionApiResponse, init: ResponseInit = {}) {
  const headers = new Headers(init.headers)
  headers.set('cache-control', 'no-store')
  return Response.json(data, { ...init, headers })
}

export const Route = createFileRoute('/api/tiktok/recognize')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!tuneClueFlags.tiktok) {
          return json(
            {
              ok: false,
              code: 'source-unavailable',
              message: 'TikTok link recognition is temporarily unavailable.',
            },
            { status: 503 },
          )
        }

        if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
          return json(
            { ok: false, code: 'invalid-request', message: 'Send a JSON request.' },
            { status: 415 },
          )
        }

        const declaredLength = Number(request.headers.get('content-length') || 0)
        if (declaredLength > MAX_JSON_BYTES) {
          return json(
            { ok: false, code: 'invalid-request', message: 'The request is too large.' },
            { status: 413 },
          )
        }

        const rate = limiter.check(`tiktok-recognize:${requestIdentity(request)}`)
        if (!rate.allowed) {
          return json(
            {
              ok: false,
              code: 'rate-limited',
              message: 'Too many recognition attempts. Try again later.',
            },
            { status: 429, headers: { 'retry-after': String(rate.retryAfterSeconds) } },
          )
        }

        let session: Awaited<ReturnType<typeof getCurrentSessionUser>>
        try {
          session = await getCurrentSessionUser(request)
        } catch (error) {
          if (error instanceof DatabaseConfigurationError) {
            return json(
              {
                ok: false,
                code: 'auth-unavailable',
                message: 'Free recognition login is not configured yet.',
              },
              { status: 503 },
            )
          }
          throw error
        }

        if (!session) {
          return json(
            {
              ok: false,
              code: 'auth-required',
              message: 'Sign in with Google to unlock free song recognition.',
            },
            { status: 401 },
          )
        }

        const bodyBytes = await readBoundedBody(request).catch(() => undefined)
        if (!bodyBytes) {
          return json(
            { ok: false, code: 'invalid-request', message: 'The request is too large.' },
            { status: 413 },
          )
        }
        let body: TikTokRecognitionRequest | null = null
        try {
          body = JSON.parse(new TextDecoder().decode(bodyBytes)) as TikTokRecognitionRequest
        } catch {
          return json(
            { ok: false, code: 'invalid-request', message: 'Send valid JSON.' },
            { status: 400 },
          )
        }
        if (!body || typeof body.url !== 'string') {
          return json(
            { ok: false, code: 'invalid-url', message: 'Paste a public TikTok video link.' },
            { status: 400 },
          )
        }

        let normalizedUrl: string
        try {
          normalizedUrl = normalizeTikTokInputUrl(body.url).toString()
        } catch (error) {
          const message =
            error instanceof TikTokUrlPolicyError
              ? error.message
              : 'Paste a valid public TikTok video link.'
          return json({ ok: false, code: 'invalid-url', message }, { status: 400 })
        }

        const attemptId = crypto.randomUUID()
        const reserved = await reserveRecognitionCredit(session.id, attemptId)
        if (!reserved) {
          return json(
            {
              ok: false,
              code: 'insufficient-credits',
              message: 'No free song searches remain. Earn free credits to continue.',
            },
            { status: 402 },
          )
        }

        try {
          const result = await runTikTokPoc({ url: normalizedUrl, action: 'recognize' })
          if (!result.recognition) throw new Error('TikTok recognition returned no result.')
          const remainingCredits = await getCreditBalance(session.id)
          return json(
            { ok: true, result: result.recognition, remainingCredits },
            { headers: { 'x-ratelimit-remaining': String(rate.remaining) } },
          )
        } catch (error) {
          await refundRecognitionCredit(session.id, attemptId).catch(() => undefined)

          if (error instanceof AudDConfigurationError) {
            return json(
              {
                ok: false,
                code: 'provider-not-configured',
                message: 'Music recognition is not configured.',
              },
              { status: 503 },
            )
          }

          if (error instanceof TikTokResolveError) {
            const userError = error.code === 'invalid-url' || error.code === 'post-unavailable'
            return json(
              {
                ok: false,
                code:
                  userError && error.code === 'invalid-url' ? 'invalid-url' : 'source-unavailable',
                message: publicTikTokMessage(error),
              },
              {
                status:
                  error.code === 'invalid-url'
                    ? 400
                    : error.code === 'post-unavailable'
                      ? 404
                      : error.code === 'provider-error'
                        ? 502
                        : 422,
              },
            )
          }

          if (error instanceof TikTokFetchError) {
            return json(
              {
                ok: false,
                code: 'source-unavailable',
                message:
                  error.code === 'media-too-large'
                    ? 'This TikTok audio is too large for recognition.'
                    : 'TikTok could not provide this public video for recognition. Try again later.',
              },
              { status: error.code === 'media-too-large' ? 413 : 502 },
            )
          }

          return json(
            {
              ok: false,
              code: 'provider-error',
              message: 'Song recognition could not complete this request.',
            },
            { status: 502 },
          )
        }
      },
    },
  },
})

function publicTikTokMessage(error: TikTokResolveError) {
  switch (error.code) {
    case 'invalid-url':
      return error.message
    case 'post-unavailable':
      return 'This TikTok video is private, deleted, restricted, or unavailable.'
    case 'structured-data-missing':
    case 'audio-url-missing':
      return 'TuneClue could not access recognizable audio from this TikTok video.'
    case 'provider-error':
      return 'Song recognition could not complete this TikTok request.'
  }
}

async function readBoundedBody(request: Request) {
  if (!request.body) return new Uint8Array()
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (!value) continue
      total += value.byteLength
      if (total > MAX_JSON_BYTES) {
        await reader.cancel().catch(() => undefined)
        throw new Error('body-too-large')
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }

  const body = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }
  return body
}
