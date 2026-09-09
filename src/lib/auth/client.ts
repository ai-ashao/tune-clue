import type { AuthSessionResponse } from './types'

export async function fetchAuthSession(): Promise<AuthSessionResponse> {
  const response = await fetch('/api/auth/session', {
    headers: { accept: 'application/json' },
    cache: 'no-store',
  })
  const payload = (await response.json().catch(() => null)) as AuthSessionResponse | null
  return payload ?? { available: false, authenticated: false }
}

export function googleSignInUrl(returnTo = '/') {
  const url = new URL('/api/auth/google', window.location.origin)
  url.searchParams.set('returnTo', returnTo)
  return `${url.pathname}${url.search}`
}

export async function signOut() {
  await fetch('/api/auth/logout', { method: 'POST' })
}
