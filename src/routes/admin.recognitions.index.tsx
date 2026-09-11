import { createFileRoute } from '@tanstack/react-router'
import { AdminRecognitionsPage } from '@/components/admin/recognitions-page'
export const Route = createFileRoute('/admin/recognitions/')({ component: AdminRecognitionsPage })
