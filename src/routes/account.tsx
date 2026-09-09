import { createFileRoute } from '@tanstack/react-router'
import { AccountPage } from '@/components/tuneclue/account-page'
import { pageHead } from '@/lib/seo'

export const Route = createFileRoute('/account')({
  head: () =>
    pageHead({
      title: 'Account | TuneClue',
      description: 'TuneClue account and credit balance.',
      path: '/account',
      indexable: false,
    }),
  component: AccountPage,
})
