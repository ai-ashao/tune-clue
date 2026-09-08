import { createFileRoute } from '@tanstack/react-router'
import { isSandboxEnabled } from '@/lib/config/runtime'

export const Route = createFileRoute('/api/health')({
  server: {
    handlers: {
      GET: () =>
        Response.json({
          ok: true,
          product: 'shiplean',
          runtime: 'tanstack-start',
          sandbox: isSandboxEnabled(),
        }),
    },
  },
})
