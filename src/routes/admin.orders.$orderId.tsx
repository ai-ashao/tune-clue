import { createFileRoute } from '@tanstack/react-router'
import { AdminOrderDetail } from '@/components/admin/orders-page'
export const Route = createFileRoute('/admin/orders/$orderId')({ component: Page })
function Page() {
  const { orderId } = Route.useParams()
  return <AdminOrderDetail orderId={orderId} />
}
