import { createFileRoute } from '@tanstack/react-router'
import { recognizeWithAudD } from '@/lib/recognition/audd.server'
import type { RecognitionApiResponse } from '@/lib/recognition/types'

const MAX_REQUEST_SAMPLE_BYTES = 3 * 1024 * 1024

function json(data: RecognitionApiResponse, init: ResponseInit = {}) {
  const headers = new Headers(init.headers)
  headers.set('cache-control', 'no-store')
  return Response.json(data, { ...init, headers })
}

export const Route = createFileRoute('/api/recognize')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const form = await request.formData().catch(() => null)
        const sample = form?.get('sample')

        if (!(sample instanceof File)) {
          return json(
            { ok: false, code: 'invalid-request', message: 'Send an audio sample in "sample".' },
            { status: 400 },
          )
        }

        if (sample.size > MAX_REQUEST_SAMPLE_BYTES) {
          return json(
            {
              ok: false,
              code: 'sample-too-large',
              message: 'The short recognition sample is too large.',
            },
            { status: 413 },
          )
        }

        try {
          const result = await recognizeWithAudD(sample)
          return json({ ok: true, result })
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Recognition failed.'
          if (message.includes('AUDD_API_TOKEN')) {
            return json({ ok: false, code: 'provider-not-configured', message }, { status: 503 })
          }
          return json({ ok: false, code: 'provider-error', message }, { status: 502 })
        }
      },
    },
  },
})
