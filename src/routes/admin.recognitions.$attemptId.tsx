import { createFileRoute } from '@tanstack/react-router'
import { AdminRecognitionDetail } from '@/components/admin/recognitions-page'
export const Route = createFileRoute('/admin/recognitions/$attemptId')({ component: Page })
function Page() {
  const { attemptId } = Route.useParams()
  return <AdminRecognitionDetail attemptId={attemptId} />
}
