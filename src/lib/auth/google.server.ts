import { getTuneClueDb } from '@/lib/db.server'
import { pkceChallenge, randomUrlSafeToken, sha256Base64Url } from './crypto'
import { buildGoogleAuthorizationUrl, googleRedirectUri, sanitizeReturnTo } from './google-oauth'

type GoogleProfile = {
  sub: string
  email: string
  email_verified?: boolean
  name?: string
  picture?: string
}

export class GoogleAuthConfigurationError extends Error {
  constructor(message = 'Google authentication is not configured.') {
    super(message)
    this.name = 'GoogleAuthConfigurationError'
  }
}

function googleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim()
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim()
  if (!clientId || !clientSecret) throw new GoogleAuthConfigurationError()
  return { clientId, clientSecret }
}

export function googleAuthConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim())
}

export async function beginGoogleOAuth(request: Request) {
  const { clientId } = googleConfig()
  const db = await getTuneClueDb()
  const url = new URL(request.url)
  const returnTo = sanitizeReturnTo(url.searchParams.get('returnTo'))
  const state = randomUrlSafeToken(24)
  const verifier = randomUrlSafeToken(32)
  const challenge = await pkceChallenge(verifier)
  const stateHash = await sha256Base64Url(state)
  const now = Date.now()
  const expiresAt = now + 10 * 60 * 1000

  await db
    .prepare('DELETE FROM oauth_states WHERE expires_at <= ?')
    .bind(now)
    .run()
    .catch(() => undefined)

  await db
    .prepare(
      `INSERT INTO oauth_states
       (state_hash, code_verifier, return_to, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(stateHash, verifier, returnTo, now, expiresAt)
    .run()

  return {
    state,
    authorizationUrl: buildGoogleAuthorizationUrl({
      clientId,
      redirectUri: googleRedirectUri(url.origin),
      state,
      codeChallenge: challenge,
    }),
  }
}

export async function finishGoogleOAuth(request: Request, input: { code: string; state: string }) {
  const { clientId, clientSecret } = googleConfig()
  const db = await getTuneClueDb()
  const stateHash = await sha256Base64Url(input.state)
  const attempt = await db
    .prepare(
      `SELECT code_verifier, return_to, expires_at
       FROM oauth_states
       WHERE state_hash = ?`,
    )
    .bind(stateHash)
    .first<{ code_verifier: string; return_to: string; expires_at: number }>()

  if (!attempt || attempt.expires_at <= Date.now()) {
    throw new Error('The Google sign-in attempt expired. Please try again.')
  }

  const redirectUri = googleRedirectUri(new URL(request.url).origin)
  const tokenBody = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code: input.code,
    code_verifier: attempt.code_verifier,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  })

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: tokenBody,
  })
  if (!tokenResponse.ok) {
    throw new Error('Google sign-in could not exchange the authorization code.')
  }

  const tokens = (await tokenResponse.json()) as { access_token?: string }
  if (!tokens.access_token) throw new Error('Google sign-in returned no access token.')

  const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { authorization: `Bearer ${tokens.access_token}` },
  })
  if (!profileResponse.ok) throw new Error('Google sign-in could not read the account profile.')

  const profile = (await profileResponse.json()) as Partial<GoogleProfile>
  if (!profile.sub || !profile.email || profile.email_verified === false) {
    throw new Error('Google returned an incomplete or unverified account.')
  }

  await db.prepare('DELETE FROM oauth_states WHERE state_hash = ?').bind(stateHash).run()

  return {
    profile: profile as GoogleProfile,
    returnTo: sanitizeReturnTo(attempt.return_to),
  }
}
