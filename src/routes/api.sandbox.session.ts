import { createFileRoute } from '@tanstack/react-router'
import {
  expiredSandboxSessionCookie,
  hasSandboxSession,
  sandboxSessionCookie,
  sandboxUser,
} from '@/lib/auth/sandbox-session'
import { isSandboxEnabled } from '@/lib/config/runtime'
import { productSurfaceEnabled } from '@/lib/product-config'

function json(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers)
  headers.set('cache-control', 'no-store')
  return Response.json(data, { ...init, headers })
}

function sandboxAvailable() {
  return productSurfaceEnabled('app') && isSandboxEnabled()
}

export const Route = createFileRoute('/api/sandbox/session')({
  server: {
    handlers: {
      GET: ({ request }) =>
        !sandboxAvailable()
          ? json({ error: 'Not found.' }, { status: 404 })
          : hasSandboxSession(request)
            ? json({ authenticated: true, user: sandboxUser })
            : json({ authenticated: false }, { status: 401 }),
      POST: async ({ request }) => {
        if (!sandboxAvailable()) return json({ error: 'Not found.' }, { status: 404 })
        const body = (await request.json().catch(() => ({}))) as { email?: string }
        if (body.email?.trim().toLowerCase() !== sandboxUser.email) {
          return json({ error: 'Use the fixed local sandbox identity.' }, { status: 400 })
        }
        return json(
          { authenticated: true, user: sandboxUser },
          {
            headers: {
              'set-cookie': sandboxSessionCookie({
                secure: new URL(request.url).protocol === 'https:',
              }),
            },
          },
        )
      },
      DELETE: ({ request }) =>
        !sandboxAvailable()
          ? json({ error: 'Not found.' }, { status: 404 })
          : json(
              { authenticated: false },
              {
                headers: {
                  'set-cookie': expiredSandboxSessionCookie({
                    secure: new URL(request.url).protocol === 'https:',
                  }),
                },
              },
            ),
    },
  },
})
