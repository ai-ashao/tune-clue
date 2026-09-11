import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  buildLegalDocument,
  defaultSupportEmailForSite,
  type LegalProfile,
  validateLegalProfile,
} from '@/lib/legal'
import { site } from '@/lib/site'
import { legalProfile } from '@/modules/legal-profile'

describe('legal page contracts', () => {
  it('derives the conventional support address from the public domain', () => {
    expect(defaultSupportEmailForSite('https://www.example-product.com/path')).toBe(
      'support@example-product.com',
    )
    expect(() => defaultSupportEmailForSite('http://localhost:3000')).toThrow(/public domain/)
  })

  it('keeps the checked-in profile structurally valid', () => {
    expect(validateLegalProfile(legalProfile)).toEqual([])
    expect(legalProfile.templateKind).toBe('account-tool')
    expect(legalProfile.siteUrl).toBe(site.url)
  })

  it('rejects placeholders, invalid dates, empty disclosures, and incomplete providers', () => {
    const invalid = {
      ...legalProfile,
      productName: 'Your Product',
      effectiveDate: '2026-02-30',
      privacy: {
        ...legalProfile.privacy,
        processingActivities: [],
      },
      features: {
        ...legalProfile.features,
        analytics: { name: '', purpose: '', data: '', legalBasis: '', retention: '' },
      },
    } satisfies LegalProfile

    expect(validateLegalProfile(invalid)).toEqual(
      expect.arrayContaining([
        'Legal profile productName still contains placeholder copy.',
        'Legal profile effectiveDate must use a valid YYYY-MM-DD date.',
        'Legal profile processingActivities must not be empty.',
        'Every declared legal provider requires a name and purpose.',
        'Analytics requires data, legalBasis, and retention disclosures.',
      ]),
    )
  })

  it('builds fixed Privacy and Terms section contracts from one profile', () => {
    const privacy = buildLegalDocument('privacy', legalProfile)
    const terms = buildLegalDocument('terms', legalProfile)

    expect(privacy.sections.map((section) => section.id)).toEqual([
      'scope',
      'processing',
      'browser-storage',
      'providers',
      'retention',
      'rights',
      'children',
      'changes-contact',
    ])
    expect(terms.sections.map((section) => section.id)).toEqual([
      'acceptance',
      'service',
      'eligibility',
      'accounts',
      'credits-rewards',
      'acceptable-use',
      'inputs-results',
      'third-parties',
      'intellectual-property',
      'availability',
      'termination',
      'disclaimers-liability',
      'changes-contact',
    ])
    expect(JSON.stringify(privacy)).toContain('uploads a short audio sample')
    expect(JSON.stringify(terms)).toContain('account-backed song-recognition tool')
    expect(JSON.stringify(terms)).not.toContain('account-free tool')
    expect(JSON.stringify(terms)).toContain('whether the recognition provider finds a match')
    expect(JSON.stringify(terms)).toContain('cannot verify whether the user publishes the post')
    expect(JSON.stringify(terms)).toContain('one-time packs through Dodo Payments')
    expect(JSON.stringify(terms)).not.toContain('does not currently sell credits')
  })

  it('keeps optional analytics fully disclosed without adding SaaS sections', () => {
    const configured = {
      ...legalProfile,
      features: {
        ...legalProfile.features,
        analytics: {
          name: 'Analytics Provider',
          purpose: 'measuring aggregate usage',
          data: 'consent-based usage information',
          legalBasis: 'the visitor’s consent',
          retention: '30 days',
        },
      },
    } satisfies LegalProfile

    expect(validateLegalProfile(configured)).toEqual([])
    const privacyCopy = JSON.stringify(buildLegalDocument('privacy', configured))
    const terms = buildLegalDocument('terms', configured)
    expect(privacyCopy).toContain('Analytics Provider')
    expect(privacyCopy).toContain('the visitor’s consent')
    expect(terms.sections.map((section) => section.id)).not.toContain('payments')
  })

  it('keeps route files as thin wrappers around the shared legal renderer', () => {
    const privacyRoute = readFileSync('src/routes/privacy-policy.tsx', 'utf8')
    const termsRoute = readFileSync('src/routes/terms-of-service.tsx', 'utf8')

    expect(privacyRoute).toContain('<LegalDocumentPage kind="privacy" profile={legalProfile} />')
    expect(termsRoute).toContain('<LegalDocumentPage kind="terms" profile={legalProfile} />')
    expect(privacyRoute).not.toContain('InformationPage')
    expect(termsRoute).not.toContain('InformationPage')
  })

  it('keeps implementation instructions out of public documents', () => {
    const publicCopy = JSON.stringify([
      buildLegalDocument('privacy', legalProfile),
      buildLegalDocument('terms', legalProfile),
    ])

    expect(publicCopy).not.toMatch(/current product configuration/i)
    expect(publicCopy).not.toMatch(/must be added before/i)
    expect(publicCopy).not.toMatch(/sandbox|paid plans|production user accounts/i)
    expect(publicCopy).not.toMatch(/operator is established|governing law/i)
  })

  it('keeps legal pages in the ordinary deployment and indexing flow', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
      scripts: Record<string, string>
    }

    expect(packageJson.scripts.deploy).toBe('pnpm build && wrangler deploy')
    expect(packageJson.scripts['legal:check']).toBeUndefined()
  })
})
