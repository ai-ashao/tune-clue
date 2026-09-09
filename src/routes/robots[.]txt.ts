import { createFileRoute } from '@tanstack/react-router'
import { absoluteUrl } from '@/lib/site'
import { siteIndexingEnabled } from '@/lib/site-indexing'

export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: () =>
        new Response(
          siteIndexingEnabled
            ? `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /dashboard\nSitemap: ${absoluteUrl('/sitemap.xml')}\n`
            : 'User-agent: *\nDisallow: /\n',
          { headers: { 'content-type': 'text/plain; charset=utf-8' } },
        ),
    },
  },
})
