import { createFileRoute } from '@tanstack/react-router'
import { AdminShell } from '@/components/admin/admin-shell'
import { pageHead } from '@/lib/seo'
export const Route = createFileRoute('/admin')({
  head: () =>
    pageHead({
      title: '内部管理',
      description: 'TuneClue 内部运营工具。',
      path: '/admin',
      indexable: false,
    }),
  component: AdminShell,
})
