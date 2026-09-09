import { createFileRoute } from '@tanstack/react-router'
import { googleAuthConfigured } from '@/lib/auth/google.server'
import { getCurrentSessionUser } from '@/lib/auth/session.server'
import type { AuthSessionResponse } from '@/lib/auth/types'
import { DatabaseConfigurationError } from '@/lib/db.server'

function json(data: AuthSessionResponse) {
  return Response.json(data, { headers: { 'cache-control': 'no-store' } })
}

export const Route = createFileRoute('/api/auth/session')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!googleAuthConfigured()) return json({ available: false, authenticated: false })
        try {
          const user = await getCurrentSessionUser(request)
          if (!user) return json({ available: true, authenticated: false })
          return json({
            available: true,
            authenticated: true,
            user: { id: user.id, email: user.email, name: user.name },
            credits: user.credits,
            shareRewards: user.shareRewards,
          })
        } catch (error) {
          if (error instanceof DatabaseConfigurationError) {
            return json({ available: false, authenticated: false })
          }
          return json({ available: true, authenticated: false })
        }
      },
    },
  },
})
