export function sanitizeReturnTo(value: string | null | undefined) {
  if (!value) return '/'
  const trimmed = value.trim()
  if (trimmed.length > 500) return '/'
  const hasUnsafeCharacter = Array.from(trimmed).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0
    return character === '\\' || codePoint < 32 || codePoint === 127
  })
  if (!trimmed.startsWith('/') || hasUnsafeCharacter) return '/'

  try {
    const base = new URL('https://tuneclue.invalid')
    const parsed = new URL(trimmed, base)
    if (parsed.origin !== base.origin) return '/'
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return '/'
  }
}

export function googleRedirectUri(origin: string) {
  return new URL('/api/auth/google/callback', origin).toString()
}

export function buildGoogleAuthorizationUrl(input: {
  clientId: string
  redirectUri: string
  state: string
  codeChallenge: string
}) {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', input.clientId)
  url.searchParams.set('redirect_uri', input.redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', 'openid email profile')
  url.searchParams.set('state', input.state)
  url.searchParams.set('code_challenge', input.codeChallenge)
  url.searchParams.set('code_challenge_method', 'S256')
  url.searchParams.set('include_granted_scopes', 'true')
  return url.toString()
}
