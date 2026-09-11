import { createFileRoute } from '@tanstack/react-router'
import { billingFailure, billingJson, readJson, requireSameOrigin } from '@/lib/billing/http'
import { identifier, object } from '@/lib/billing/types'

export const Route = createFileRoute('/api/billing/reconcile')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { billingConfig, billingContext, billingUser } = await import(
            '@/lib/billing/runtime.server'
          )
          requireSameOrigin(request, (await billingConfig()).siteUrl)
          const user = await billingUser(request)
          const id = identifier(object(await readJson(request)).orderId)
          const { reconcileOrder } = await import('@/lib/billing/service')
          return billingJson({
            ok: true,
            order: await reconcileOrder(await billingContext(), user.id, id),
          })
        } catch (error) {
          return billingFailure(error)
        }
      },
    },
  },
})
