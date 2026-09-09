import { createFileRoute } from '@tanstack/react-router'
import {
  OAUTH_STATE_COOKIE,
  secureCookieForRequest,
  serializeCookie,
} from '@/lib/auth/cookies.server'
import { beginGoogleOAuth, GoogleAuthConfigurationError } from '@/lib/auth/google.server'
import { DatabaseConfigurationError } from '@/lib/db.server'

export const Route = createFileRoute('/api/auth/google')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const attempt = await beginGoogleOAuth(request)
          const headers = new Headers({ location: attempt.authorizationUrl })
          headers.append(
            'set-cookie',
            serializeCookie(OAUTH_STATE_COOKIE, attempt.state, {
              secure: secureCookieForRequest(request),
              sameSite: 'Lax',
              maxAge: 10 * 60,
            }),
          )
          return new Response(null, { status: 302, headers })
        } catch (error) {
          if (
            error instanceof DatabaseConfigurationError ||
            error instanceof GoogleAuthConfigurationError
          ) {
            return new Response('Google sign-in is not configured yet.', { status: 503 })
          }
          return new Response('Google sign-in could not start.', { status: 500 })
        }
      },
    },
  },
})
