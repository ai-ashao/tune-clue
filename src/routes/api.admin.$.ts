import { createFileRoute } from '@tanstack/react-router'
import { serveAdmin } from '@/lib/admin/runtime.server'

export const Route = createFileRoute('/api/admin/$')({
  server: {
    handlers: {
      GET: ({ request }) => serveAdmin(request),
      POST: ({ request }) => serveAdmin(request),
    },
  },
})
