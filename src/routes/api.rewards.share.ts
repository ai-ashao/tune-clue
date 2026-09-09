import { createFileRoute } from '@tanstack/react-router'
import { getCurrentSessionUser } from '@/lib/auth/session.server'
import { grantShareReward } from '@/lib/credits/server'
import { isSharePlatform, sharePlatforms } from '@/lib/credits/share-tasks'

export const Route = createFileRoute('/api/rewards/share')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await getCurrentSessionUser(request).catch(() => undefined)
        if (!session) {
          return Response.json(
            { ok: false, message: 'Sign in to claim free credits.' },
            { status: 401 },
          )
        }

        const payload = (await request.json().catch(() => null)) as { platform?: unknown } | null
        if (!payload || !isSharePlatform(payload.platform)) {
          return Response.json(
            { ok: false, message: 'Unsupported share platform.' },
            { status: 400 },
          )
        }

        try {
          const reward = await grantShareReward(session.id, payload.platform)
          const refreshed = await getCurrentSessionUser(request)
          return Response.json(
            {
              ok: true,
              granted: reward.granted,
              credits: reward.balance,
              shareRewards: refreshed?.shareRewards ?? session.shareRewards,
              maxShareRewards: sharePlatforms.length,
            },
            { headers: { 'cache-control': 'no-store' } },
          )
        } catch {
          return Response.json(
            { ok: false, message: 'Could not grant the share reward.' },
            { status: 500 },
          )
        }
      },
    },
  },
})
