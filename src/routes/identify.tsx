import { createFileRoute } from '@tanstack/react-router'
import { IdentifyWorkbench } from '@/components/tuneclue/identify-workbench'
import { pageHead } from '@/lib/seo'

export const Route = createFileRoute('/identify')({
  head: () =>
    pageHead({
      title: 'Identify Song',
      description: 'TuneClue recognition workbench.',
      path: '/identify',
      indexable: false,
    }),
  component: IdentifyWorkbench,
})
