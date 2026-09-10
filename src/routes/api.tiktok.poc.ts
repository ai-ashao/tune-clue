import { createFileRoute } from '@tanstack/react-router'
import { AudDConfigurationError } from '@/lib/recognition/audd.server'
import { FixedWindowRateLimiter, requestIdentity } from '@/lib/security/rate-limit'
import { TikTokFetchError } from '@/lib/tiktok/fetch.server'
import { runTikTokPoc, TikTokResolveError } from '@/lib/tiktok/resolve.server'
import type { TikTokPocAction, TikTokPocErrorCode } from '@/lib/tiktok/types'

const limiter = new FixedWindowRateLimiter(30, 60 * 60 * 1000)

type PocRequest = {
  url?: unknown
  action?: unknown
}

export const Route = createFileRoute('/api/tiktok/poc')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const configuredToken = process.env.TIKTOK_POC_TOKEN?.trim()
        if (!configuredToken) {
          return jsonError('not-configured', 'TikTok PoC endpoint is not configured.', 503)
        }

        const suppliedToken = bearerToken(request)
        if (!suppliedToken || !constantTimeEqual(suppliedToken, configuredToken)) {
          return jsonError('unauthorized', 'TikTok PoC token is invalid.', 401)
        }

        const rate = limiter.check(`tiktok-poc:${requestIdentity(request)}`)
        if (!rate.allowed) {
          return Response.json(
            {
              ok: false,
              code: 'upstream-rate-limited' satisfies TikTokPocErrorCode,
              message: 'Too many TikTok PoC requests. Try again later.',
            },
            {
              status: 429,
              headers: {
                'cache-control': 'no-store',
                'retry-after': String(rate.retryAfterSeconds),
              },
            },
          )
        }

        const body = (await request.json().catch(() => null)) as PocRequest | null
        if (!body || typeof body.url !== 'string') {
          return jsonError('invalid-url', 'Send a TikTok URL in the JSON "url" field.', 400)
        }

        const action = parseAction(body.action)
        if (!action) {
          return jsonError('invalid-url', 'Action must be "resolve", "probe", or "recognize".', 400)
        }

        try {
          const result = await runTikTokPoc({ url: body.url, action })
          return Response.json(
            { ok: true, ...result },
            { headers: { 'cache-control': 'no-store' } },
          )
        } catch (caught) {
          if (caught instanceof TikTokResolveError) {
            return jsonError(caught.code, publicMessage(caught), statusForResolve(caught.code))
          }

          if (caught instanceof TikTokFetchError) {
            return jsonError(caught.code, caught.message, statusForFetch(caught.code))
          }

          if (caught instanceof AudDConfigurationError) {
            return jsonError('provider-error', 'AudD is not configured.', 503)
          }

          return jsonError(
            'upstream-failed',
            caught instanceof Error ? caught.message : 'TikTok PoC failed.',
            502,
          )
        }
      },
    },
  },
})

function parseAction(value: unknown): TikTokPocAction | undefined {
  if (value === undefined) return 'resolve'
  return value === 'resolve' || value === 'probe' || value === 'recognize' ? value : undefined
}

function bearerToken(request: Request) {
  const authorization = request.headers.get('authorization') || ''
  const match = authorization.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim()
}

function constantTimeEqual(a: string, b: string) {
  const left = new TextEncoder().encode(a)
  const right = new TextEncoder().encode(b)
  const length = Math.max(left.length, right.length)
  let diff = left.length ^ right.length

  for (let index = 0; index < length; index += 1) {
    diff |= (left[index] || 0) ^ (right[index] || 0)
  }

  return diff === 0
}

function publicMessage(errorValue: TikTokResolveError) {
  if (errorValue.code === 'provider-error') {
    return 'AudD could not complete the TikTok PoC recognition request.'
  }
  return errorValue.message
}

function statusForResolve(code: TikTokResolveError['code']) {
  switch (code) {
    case 'invalid-url':
      return 400
    case 'post-unavailable':
      return 404
    case 'structured-data-missing':
    case 'audio-url-missing':
      return 422
    case 'provider-error':
      return 502
  }
}

function statusForFetch(code: TikTokFetchError['code']) {
  switch (code) {
    case 'upstream-blocked':
    case 'upstream-failed':
    case 'media-unavailable':
      return 502
    case 'upstream-rate-limited':
      return 503
    case 'media-too-large':
      return 413
  }
}

function jsonError(code: TikTokPocErrorCode, message: string, status: number) {
  return Response.json(
    { ok: false, code, message },
    { status, headers: { 'cache-control': 'no-store' } },
  )
}
