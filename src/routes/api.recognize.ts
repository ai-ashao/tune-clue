import { createFileRoute } from '@tanstack/react-router'
import { AudDConfigurationError, recognizeWithAudD } from '@/lib/recognition/audd.server'
import {
  RecognitionRequestBodyTooLargeError,
  readBoundedRecognitionBody,
  validateRecognitionRequestHeaders,
  validateRecognitionSample,
} from '@/lib/recognition/request-policy'
import type { RecognitionApiResponse } from '@/lib/recognition/types'
import { FixedWindowRateLimiter, requestIdentity } from '@/lib/security/rate-limit'

const recognitionLimiter = new FixedWindowRateLimiter(10, 60 * 60 * 1000)

function json(data: RecognitionApiResponse, init: ResponseInit = {}) {
  const headers = new Headers(init.headers)
  headers.set('cache-control', 'no-store')
  return Response.json(data, { ...init, headers })
}

export const Route = createFileRoute('/api/recognize')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const headerError = validateRecognitionRequestHeaders(request)
        if (headerError) {
          return json(
            {
              ok: false,
              code: headerError.code,
              message: headerError.message,
            },
            { status: headerError.status },
          )
        }

        // Best-effort application-layer guard. Production should also keep a
        // Cloudflare rate-limit/WAF rule because isolate memory is not a global quota store.
        const rateLimit = recognitionLimiter.check(`recognize:${requestIdentity(request)}`)
        if (!rateLimit.allowed) {
          return json(
            {
              ok: false,
              code: 'rate-limited',
              message: 'Too many recognition attempts. Try again later.',
            },
            {
              status: 429,
              headers: {
                'retry-after': String(rateLimit.retryAfterSeconds),
                'x-ratelimit-remaining': '0',
              },
            },
          )
        }

        let boundedBody: ArrayBuffer
        try {
          boundedBody = await readBoundedRecognitionBody(request)
        } catch (error) {
          if (error instanceof RecognitionRequestBodyTooLargeError) {
            return json(
              {
                ok: false,
                code: 'sample-too-large',
                message: 'The recognition request body is too large.',
              },
              { status: 413 },
            )
          }
          return json(
            {
              ok: false,
              code: 'invalid-request',
              message: 'TuneClue could not read the recognition request.',
            },
            { status: 400 },
          )
        }

        const contentType = request.headers.get('content-type')
        if (!contentType) {
          return json(
            {
              ok: false,
              code: 'invalid-request',
              message: 'Recognition request content type is missing.',
            },
            { status: 400 },
          )
        }

        const boundedRequest = new Request(request.url, {
          method: 'POST',
          headers: { 'content-type': contentType },
          body: boundedBody,
        })
        const form = await boundedRequest.formData().catch(() => null)
        const sample = form?.get('sample')

        if (!(sample instanceof File)) {
          return json(
            { ok: false, code: 'invalid-request', message: 'Send an audio sample in "sample".' },
            { status: 400 },
          )
        }

        const sampleError = await validateRecognitionSample(sample)
        if (sampleError) {
          return json(
            {
              ok: false,
              code: sampleError.code,
              message: sampleError.message,
            },
            { status: sampleError.status },
          )
        }

        try {
          const result = await recognizeWithAudD(sample)
          return json(
            { ok: true, result },
            {
              headers: {
                'x-ratelimit-remaining': String(rateLimit.remaining),
              },
            },
          )
        } catch (error) {
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
          return json(
            {
              ok: false,
              code: 'provider-error',
              message: 'The music recognition provider could not complete this request.',
            },
            { status: 502 },
          )
        }
      },
    },
  },
})
