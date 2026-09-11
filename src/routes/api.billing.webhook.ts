import { createFileRoute } from '@tanstack/react-router'
import { providerReady } from '@/lib/billing/config'
import { billingFailure, billingJson, readBody } from '@/lib/billing/http'
import { verifyWebhook } from '@/lib/billing/signature'
import { BillingError } from '@/lib/billing/types'

export const Route = createFileRoute('/api/billing/webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { billingConfig, billingContext } = await import('@/lib/billing/runtime.server')
          const config = await billingConfig()
          // Deliberately independent of BILLING_ENABLED: honor late payments/refunds while new sales are paused.
          if (!providerReady(config))
            throw new BillingError('billing-config', 'Webhook processing is not configured.', 503)
          const raw = await readBody(request, 256 * 1024)
          const event = await verifyWebhook(
            raw,
            request.headers,
            config.webhookKey,
            config.businessId,
          )
          const { receiveWebhook } = await import('@/lib/billing/service')
          // No 200 until the verified event is durably applied or explicitly recorded for review.
          return billingJson(await receiveWebhook(await billingContext(), event))
        } catch (error) {
          return billingFailure(error)
        }
      },
    },
  },
})
