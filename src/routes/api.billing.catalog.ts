import { createFileRoute } from '@tanstack/react-router'
import { catalog } from '@/lib/billing/config'
import { billingFailure, billingJson } from '@/lib/billing/http'

export const Route = createFileRoute('/api/billing/catalog')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { billingConfig } = await import('@/lib/billing/runtime.server')
          return billingJson(catalog(await billingConfig()))
        } catch (error) {
          return billingFailure(error)
        }
      },
    },
  },
})
