import { createFileRoute } from '@tanstack/react-router'
import { sitemapPaths } from '@/i18n/routes'
import { absoluteUrl } from '@/lib/site'

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: () => {
        const paths = sitemapPaths()
        const urls = paths.map((path) => `<url><loc>${absoluteUrl(path)}</loc></url>`).join('')
        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
          { headers: { 'content-type': 'application/xml; charset=utf-8' } },
        )
      },
    },
  },
})
