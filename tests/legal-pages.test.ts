import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  buildLegalDocument,
  defaultSupportEmailForSite,
  isLegalProfileLaunchReady,
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

  it('keeps the checked-in profile structurally valid and reports its launch state', () => {
    expect(validateLegalProfile(legalProfile)).toEqual([])
    expect(legalProfile.templateKind).toBe('free-local-tool')
    const releaseIssues = validateLegalProfile(legalProfile, { requireReviewed: true })
    expect(isLegalProfileLaunchReady(legalProfile)).toBe(releaseIssues.length === 0)
    if (legalProfile.reviewStatus === 'starter') {
      expect(releaseIssues).toContain('Legal profile must be reviewed before production launch.')
    }
    expect(legalProfile.siteUrl).toBe(site.url)
  })

  it('rejects placeholders, invalid dates, empty disclosures, and incomplete providers', () => {
    const invalid = {
      ...legalProfile,
      operatorName: 'Your Company',
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
        'Legal profile operatorName still contains placeholder copy.',
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
      'acceptable-use',
      'inputs-results',
      'intellectual-property',
      'availability',
      'disclaimers-liability',
      'governing-law',
      'changes-contact',
    ])
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
    expect(terms.sections.map((section) => section.id)).not.toEqual(
      expect.arrayContaining(['accounts', 'payments', 'content']),
    )
  })

  it('keeps route files as thin wrappers around the shared legal renderer', () => {
    const privacyRoute = readFileSync('src/routes/privacy-policy.tsx', 'utf8')
    const termsRoute = readFileSync('src/routes/terms-of-service.tsx', 'utf8')

    expect(privacyRoute).toContain('<LegalDocumentPage kind="privacy" profile={legalProfile} />')
    expect(termsRoute).toContain('<LegalDocumentPage kind="terms" profile={legalProfile} />')
    expect(privacyRoute).not.toContain('InformationPage')
    expect(termsRoute).not.toContain('InformationPage')
  })

  it('keeps implementation instructions out of reviewed public documents', () => {
    const reviewed = {
      ...legalProfile,
      reviewStatus: 'reviewed',
      governingLaw: 'the laws of the State of Delaware, United States',
    } satisfies LegalProfile

    const publicCopy = JSON.stringify([
      buildLegalDocument('privacy', reviewed),
      buildLegalDocument('terms', reviewed),
    ])

    expect(publicCopy).not.toMatch(/current product configuration/i)
    expect(publicCopy).not.toMatch(/must be added before/i)
    expect(publicCopy).not.toMatch(/sandbox|paid plans|production user accounts/i)
    expect(isLegalProfileLaunchReady(reviewed)).toBe(true)
  })

  it('wires the strict legal check into the deployment command', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
      scripts: Record<string, string>
    }
    const releaseTest = readFileSync('tests/legal-release.test.ts', 'utf8')

    expect(packageJson.scripts.deploy).toMatch(/^pnpm legal:check &&/)
    expect(packageJson.scripts.test).toContain('--exclude tests/legal-release.test.ts')
    expect(packageJson.scripts['legal:check']).toContain('--mode production')
    expect(releaseTest).toContain('requireReviewed: true')
  })
})
