import { createFileRoute } from '@tanstack/react-router'
import { billingFailure, billingJson } from '@/lib/billing/http'

export const Route = createFileRoute('/api/billing/orders')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const { billingUser } = await import('@/lib/billing/runtime.server')
          const user = await billingUser(request)
          const { getTuneClueDb } = await import('@/lib/db.server')
          const { orderHistory } = await import('@/lib/billing/store')
          return billingJson({ ok: true, ...(await orderHistory(await getTuneClueDb(), user.id)) })
        } catch (error) {
          return billingFailure(error)
        }
      },
    },
  },
})
