import { createFileRoute } from '@tanstack/react-router'
import {
  clearCookie,
  OAUTH_STATE_COOKIE,
  readCookie,
  SESSION_COOKIE,
  secureCookieForRequest,
  serializeCookie,
} from '@/lib/auth/cookies.server'
import { finishGoogleOAuth } from '@/lib/auth/google.server'
import { createOrUpdateGoogleUser, createSession } from '@/lib/auth/session.server'

export const Route = createFileRoute('/api/auth/google/callback')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const code = url.searchParams.get('code')
        const state = url.searchParams.get('state')
        const cookieState = readCookie(request, OAUTH_STATE_COOKIE)
        const oauthError = url.searchParams.get('error')

        if (oauthError) return new Response('Google sign-in was cancelled.', { status: 400 })
        if (!code || !state || !cookieState || cookieState !== state) {
          return new Response('Invalid Google sign-in callback.', { status: 400 })
        }

        try {
          const completed = await finishGoogleOAuth(request, { code, state })
          const user = await createOrUpdateGoogleUser(completed.profile)
          const session = await createSession(user.id)
          const secure = secureCookieForRequest(request)
          const headers = new Headers({ location: completed.returnTo })
          headers.append(
            'set-cookie',
            serializeCookie(SESSION_COOKIE, session.token, {
              secure,
              sameSite: 'Lax',
              maxAge: 30 * 24 * 60 * 60,
            }),
          )
          headers.append('set-cookie', clearCookie(OAUTH_STATE_COOKIE, secure))
          return new Response(null, { status: 302, headers })
        } catch {
          return new Response('Google sign-in could not finish. Please try again.', { status: 400 })
        }
      },
    },
  },
})
