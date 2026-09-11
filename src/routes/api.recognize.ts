import { createFileRoute } from '@tanstack/react-router'
import { serveRecognition } from '@/lib/recognition/runtime.server'
export const Route = createFileRoute('/api/recognize')({
  server: { handlers: { POST: ({ request }) => serveRecognition(request, 'local_file') } },
})
