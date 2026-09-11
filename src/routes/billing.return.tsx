import { createFileRoute } from '@tanstack/react-router'
import { BillingReturnPage } from '@/components/tuneclue/billing-return-page'
import { pageHead } from '@/lib/seo'

export const Route = createFileRoute('/billing/return')({
  head: () => {
    const head = pageHead({
      title: 'Payment Status',
      description:
        'Check the confirmed status of your TuneClue credit purchase and return to your song search.',
      path: '/billing/return',
      indexable: false,
    })
    return { ...head, meta: [...head.meta, { name: 'referrer', content: 'no-referrer' }] }
  },
  component: BillingReturnPage,
})
