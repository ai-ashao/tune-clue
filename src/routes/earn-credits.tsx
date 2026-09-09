import { createFileRoute } from '@tanstack/react-router'
import { EarnCreditsPage } from '@/components/tuneclue/earn-credits-page'
import { pageHead } from '@/lib/seo'

export const Route = createFileRoute('/earn-credits')({
  head: () =>
    pageHead({
      title: 'Earn Free Credits | TuneClue',
      description: 'Optional TuneClue sharing rewards.',
      path: '/earn-credits',
      indexable: false,
    }),
  component: EarnCreditsPage,
})
