import { createFileRoute } from '@tanstack/react-router'
import { AdminOrdersPage } from '@/components/admin/orders-page'
export const Route = createFileRoute('/admin/orders/')({ component: AdminOrdersPage })
