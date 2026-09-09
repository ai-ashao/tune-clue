export const SESSION_COOKIE = 'tuneclue_session'
export const OAUTH_STATE_COOKIE = 'tuneclue_oauth_state'

type CookieOptions = {
  maxAge?: number
  expires?: Date
  httpOnly?: boolean
  sameSite?: 'Lax' | 'Strict'
  secure?: boolean
}

export function readCookie(request: Request, name: string) {
  const raw = request.headers.get('cookie') || ''
  for (const part of raw.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return decodeURIComponent(rest.join('='))
  }
  return undefined
}

export function serializeCookie(name: string, value: string, options: CookieOptions = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/']
  if (options.httpOnly ?? true) parts.push('HttpOnly')
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`)
  if (options.secure) parts.push('Secure')
  if (typeof options.maxAge === 'number') parts.push(`Max-Age=${Math.floor(options.maxAge)}`)
  if (options.expires) parts.push(`Expires=${options.expires.toUTCString()}`)
  return parts.join('; ')
}

export function clearCookie(name: string, secure: boolean) {
  return serializeCookie(name, '', {
    secure,
    sameSite: 'Lax',
    expires: new Date(0),
    maxAge: 0,
  })
}

export function secureCookieForRequest(request: Request) {
  return new URL(request.url).protocol === 'https:'
}
