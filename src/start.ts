import { createMiddleware, createStart } from '@tanstack/react-start'
import { adminDocumentGuard, isAdminPath } from '@/lib/admin/runtime.server'

const canonicalHost = createMiddleware({ type: 'request' }).server(async ({ request, next }) => {
  const url = new URL(request.url)

  if (url.hostname === 'www.tuneclue.com') {
    url.hostname = 'tuneclue.com'
    url.port = ''
    return Response.redirect(url.toString(), 308)
  }

  return next()
})

const securityHeaders = createMiddleware({ type: 'request' }).server(async ({ request, next }) => {
  const pathname = new URL(request.url).pathname
  const admin = isAdminPath(pathname)
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    const denied = await adminDocumentGuard(request)
    if (denied) return denied
  }
  const result = await next()
  const headers = new Headers(result.response.headers)
  headers.set(
    'content-security-policy',
    [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "img-src 'self' data: https://i.scdn.co https://mzstatic.com https://*.mzstatic.com https://e-cdns-images.dzcdn.net",
      "media-src 'self' blob:",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self'",
      "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
      "connect-src 'self' https://www.google-analytics.com",
    ].join('; '),
  )
  headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=()')
  headers.set('referrer-policy', 'strict-origin-when-cross-origin')
  headers.set('x-content-type-options', 'nosniff')
  headers.set('x-frame-options', 'DENY')
  if (admin) {
    headers.set('cache-control', 'private, no-store')
    headers.set('x-robots-tag', 'noindex, nofollow')
    headers.set('referrer-policy', 'no-referrer')
    headers.append('vary', 'Cookie')
    headers.set(
      'content-security-policy',
      [
        "default-src 'self'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "img-src 'self' data:",
        "style-src 'self' 'unsafe-inline'",
        "font-src 'self'",
        "script-src 'self' 'unsafe-inline'",
        "connect-src 'self'",
        "media-src 'none'",
      ].join('; '),
    )
  }

  return {
    ...result,
    response: new Response(result.response.body, {
      status: result.response.status,
      statusText: result.response.statusText,
      headers,
    }),
  }
})

export const startInstance = createStart(() => ({
  requestMiddleware: [canonicalHost, securityHeaders],
}))
