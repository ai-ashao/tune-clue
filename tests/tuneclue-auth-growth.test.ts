import { describe, expect, it } from 'vitest'
import { buildGoogleAuthorizationUrl, sanitizeReturnTo } from '@/lib/auth/google-oauth'
import { buildShareUrl, sharePlatforms } from '@/lib/credits/share-tasks'

describe('TuneClue Google auth and free-growth contracts', () => {
  it('keeps OAuth return paths local', () => {
    expect(sanitizeReturnTo('/identify?resume=1')).toBe('/identify?resume=1')
    expect(sanitizeReturnTo('https://attacker.example')).toBe('/')
    expect(sanitizeReturnTo('//attacker.example')).toBe('/')
    expect(sanitizeReturnTo('/\\attacker.example')).toBe('/')
    expect(sanitizeReturnTo('/identify\n?resume=1')).toBe('/')
  })

  it('builds Google authorization with PKCE and state', () => {
    const url = new URL(
      buildGoogleAuthorizationUrl({
        clientId: 'client',
        redirectUri: 'https://tuneclue.com/api/auth/google/callback',
        state: 'state',
        codeChallenge: 'challenge',
      }),
    )
    expect(url.hostname).toBe('accounts.google.com')
    expect(url.searchParams.get('state')).toBe('state')
    expect(url.searchParams.get('code_challenge')).toBe('challenge')
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    expect(url.searchParams.get('scope')).toContain('email')
  })

  it('freezes exactly two optional one-time share platforms', () => {
    expect(sharePlatforms).toEqual(['whatsapp', 'x'])
  })

  it('builds zero-API share intents with source tracking', () => {
    for (const platform of sharePlatforms) {
      const shareUrl = new URL(buildShareUrl(platform, 'https://tuneclue.com'))
      expect(['wa.me', 'twitter.com']).toContain(shareUrl.hostname)
      const decoded = decodeURIComponent(shareUrl.toString())
      expect(decoded).toContain(`utm_source=${platform}`)
      expect(decoded).toContain('utm_medium=share_reward')
    }
  })
})
