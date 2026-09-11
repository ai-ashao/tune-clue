import { createFileRoute } from '@tanstack/react-router'
import { serveRecognitionStatus } from '@/lib/recognition/runtime.server'
export const Route = createFileRoute('/api/recognition/status')({
  server: { handlers: { GET: ({ request }) => serveRecognitionStatus(request) } },
})
