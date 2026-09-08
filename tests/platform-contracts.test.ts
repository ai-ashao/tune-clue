import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { createGtagQueue } from '../src/components/privacy-controls'
import { disabledEmailAdapter } from '../src/lib/adapters/email'
import { disabledStorageAdapter } from '../src/lib/adapters/storage'
import {
  expiredSandboxSessionCookie,
  hasSandboxSession,
  sandboxSessionCookie,
} from '../src/lib/auth/sandbox-session'
import { parsePublicEnv } from '../src/lib/config/env'
import { isSandboxEnabled } from '../src/lib/config/runtime'
import { FixedWindowRateLimiter } from '../src/lib/security/rate-limit'
import { moduleManifests } from '../src/modules/manifests'

describe('platform contracts', () => {
  it('validates public environment values early', () => {
    expect(parsePublicEnv({ VITE_SITE_URL: 'http://localhost:3000/' }).siteUrl).toBe(
      'http://localhost:3000',
    )
    expect(() => parsePublicEnv({ VITE_SITE_URL: 'not a URL' })).toThrow(/VITE_SITE_URL/)
    expect(() =>
      parsePublicEnv({ VITE_SITE_URL: 'https://example.com', VITE_GA4_ID: 'invalid' }),
    ).toThrow(/VITE_GA4_ID/)
  })

  it('keeps sandbox routes disabled in production unless explicitly enabled', () => {
    expect(isSandboxEnabled({ development: true, flag: 'false' })).toBe(true)
    expect(isSandboxEnabled({ development: false, flag: 'false' })).toBe(false)
    expect(isSandboxEnabled({ development: false, flag: 'true' })).toBe(true)
  })

  it('recognizes only the explicit HttpOnly sandbox session cookie value', () => {
    const cookie = sandboxSessionCookie()
    const request = new Request('http://local.test', {
      headers: { cookie: cookie.split(';')[0] || '' },
    })
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('SameSite=Lax')
    expect(hasSandboxSession(request)).toBe(true)
    expect(hasSandboxSession(new Request('http://local.test'))).toBe(false)
    expect(sandboxSessionCookie({ secure: true })).toContain('; Secure')
    expect(expiredSandboxSessionCookie()).toContain('Max-Age=0')
    expect(expiredSandboxSessionCookie({ secure: true })).toContain('; Secure')
  })

  it('queues native gtag arguments instead of a rest-parameter array', () => {
    const dataLayer: unknown[] = []
    const gtag = createGtagQueue(dataLayer)
    gtag('consent', 'default', { analytics_storage: 'denied' })
    expect(Array.isArray(dataLayer[0])).toBe(false)
    expect(Array.from(dataLayer[0] as IArguments)).toEqual([
      'consent',
      'default',
      { analytics_storage: 'denied' },
    ])
  })

  it('enforces a fixed request window and resets after it expires', () => {
    const limiter = new FixedWindowRateLimiter(2, 1_000)
    expect(limiter.check('maker', 0).allowed).toBe(true)
    expect(limiter.check('maker', 1).allowed).toBe(true)
    expect(limiter.check('maker', 2).allowed).toBe(false)
    expect(limiter.check('maker', 1_001).allowed).toBe(true)
  })

  it('declares complete, uniquely named module manifests', () => {
    expect(new Set(moduleManifests.map((manifest) => manifest.id)).size).toBe(
      moduleManifests.length,
    )
    for (const manifest of moduleManifests) {
      expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/)
      expect(manifest.securityBoundary.length).toBeGreaterThan(20)
      expect(manifest.disable.length).toBeGreaterThan(10)
      expect(manifest.acceptance.length).toBeGreaterThan(0)
    }
  })

  it('keeps external email and storage disabled without configuration', async () => {
    await expect(
      disabledEmailAdapter.send({ to: 'maker@example.com', subject: 'Hello', html: '<p>Hi</p>' }),
    ).rejects.toThrow(/disabled/)
    await expect(disabledStorageAdapter.get('missing')).resolves.toBeNull()
  })

  it('bundles an invokable Agent quick-start Skill', () => {
    const skill = readFileSync('.agents/skills/shiplean-quick-start/SKILL.md', 'utf8')
    expect(skill).toContain('name: shiplean-quick-start')
    expect(skill).toContain('Read `AGENTS.md` completely.')
    expect(skill).toContain('git remote -v')
    expect(skill).toContain('rename that remote to `template`')
    expect(skill).toContain('private visibility by default')
    expect(skill).toContain('must never target `ai-ashao/shiplean`')
    expect(skill).toContain('Run `pnpm verify`.')
    expect(skill).toContain('read back the remote branch SHA')
  })

  it('documents the actual TanStack Agent handoff', () => {
    const readme = readFileSync('README.md', 'utf8')
    const tutorial = readFileSync('docs/getting-started.md', 'utf8')
    const configuration = readFileSync('docs/configuration.md', 'utf8')

    expect(readme).toContain('[Build your first ShipLean MVP](./docs/getting-started.md)')
    expect(readme).toContain('TanStack Start only')
    expect(readme).toContain('independent private GitHub repository')
    expect(tutorial).toContain('$shiplean-quick-start` is an Agent Skill invocation')
    expect(tutorial).toContain('never `ai-ashao/shiplean`')
    expect(tutorial).toContain('pnpm verify')
    expect(configuration).toContain('VITE_SITE_URL')
    expect(configuration).toContain('SHIPLEAN_SANDBOX=false')
  })
})
