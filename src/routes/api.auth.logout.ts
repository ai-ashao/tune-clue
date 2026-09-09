import { createFileRoute } from '@tanstack/react-router'
import { clearCookie, SESSION_COOKIE, secureCookieForRequest } from '@/lib/auth/cookies.server'
import { destroySession } from '@/lib/auth/session.server'

export const Route = createFileRoute('/api/auth/logout')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        await destroySession(request).catch(() => undefined)
        return new Response(null, {
          status: 204,
          headers: {
            'set-cookie': clearCookie(SESSION_COOKIE, secureCookieForRequest(request)),
          },
        })
      },
    },
  },
})
