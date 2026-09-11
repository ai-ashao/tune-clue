import { createFileRoute } from '@tanstack/react-router'
import { BuyCreditsPage } from '@/components/tuneclue/buy-credits-page'
import { pageHead } from '@/lib/seo'

export const Route = createFileRoute('/buy-credits')({
  head: () =>
    pageHead({
      title: 'Buy Song Recognition Credits',
      description:
        'Buy a one-time TuneClue credit pack. No subscription or automatic renewal. Review the recognition and credit rules before checkout.',
      path: '/buy-credits',
      indexable: false,
    }),
  component: BuyCreditsPage,
})
