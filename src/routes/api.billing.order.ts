import { createFileRoute } from '@tanstack/react-router'
import { billingFailure, billingJson } from '@/lib/billing/http'
import { identifier, publicOrder } from '@/lib/billing/types'

export const Route = createFileRoute('/api/billing/order')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const { billingUser } = await import('@/lib/billing/runtime.server')
          const user = await billingUser(request)
          const id = identifier(new URL(request.url).searchParams.get('id'))
          const { getTuneClueDb } = await import('@/lib/db.server')
          const { ownOrder } = await import('@/lib/billing/store')
          return billingJson({
            ok: true,
            order: publicOrder(await ownOrder(await getTuneClueDb(), id, user.id)),
          })
        } catch (error) {
          return billingFailure(error)
        }
      },
    },
  },
})
