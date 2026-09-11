import { createFileRoute } from '@tanstack/react-router'
import { AdminUserDetail } from '@/components/admin/users-page'
export const Route = createFileRoute('/admin/users/$userId')({ component: Page })
function Page() {
  const { userId } = Route.useParams()
  return <AdminUserDetail userId={userId} />
}
