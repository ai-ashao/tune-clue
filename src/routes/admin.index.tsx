import { createFileRoute } from '@tanstack/react-router'
import { AdminOverviewPage } from '@/components/admin/overview-page'
export const Route = createFileRoute('/admin/')({ component: AdminOverviewPage })
