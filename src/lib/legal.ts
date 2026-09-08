export const legalTemplateVersion = '0.1' as const

export type LegalReviewStatus = 'starter' | 'reviewed'

export type LegalProvider = {
  name: string
  purpose: string
}

export type LegalProcessingActivity = {
  data: string
  purpose: string
  legalBasis: string
  retention: string
  recipients: ReadonlyArray<string>
}

export type LegalAnalyticsProfile = LegalProvider & {
  data: string
  legalBasis: string
  retention: string
}

export type LegalFeatureProfile = {
  analytics: false | LegalAnalyticsProfile
}

export type LegalProfile = {
  templateVersion: typeof legalTemplateVersion
  templateKind: 'free-local-tool'
  reviewStatus: LegalReviewStatus
  productName: string
  operatorName: string
  siteUrl: string
  contactEmail: string
  effectiveDate: string
  lastUpdated: string
  governingLaw: string
  features: LegalFeatureProfile
  privacy: {
    processingActivities: ReadonlyArray<LegalProcessingActivity>
    browserStorage: ReadonlyArray<string>
    serviceProviders: ReadonlyArray<LegalProvider>
    internationalTransfers: string
  }
}

export type LegalSection = {
  id: string
  title: string
  paragraphs: ReadonlyArray<string>
  items?: ReadonlyArray<string>
}

export type LegalDocument = {
  kind: 'privacy' | 'terms'
  title: string
  description: string
  sections: ReadonlyArray<LegalSection>
}

export function defineLegalProfile<const T extends LegalProfile>(profile: T): T {
  return profile
}

export function defaultSupportEmailForSite(
  siteUrl: string,
  options: Readonly<{ fallbackSiteUrl?: string }> = {},
): string {
  try {
    return supportEmailForPublicSite(siteUrl)
  } catch (error) {
    if (!options.fallbackSiteUrl) throw error
    return supportEmailForPublicSite(options.fallbackSiteUrl)
  }
}

function supportEmailForPublicSite(siteUrl: string): string {
  const hostname = new URL(siteUrl).hostname.toLowerCase().replace(/^www\./, '')
  if (
    !hostname ||
    hostname === 'localhost' ||
    hostname.includes(':') ||
    /^\d+(\.\d+)+$/.test(hostname)
  ) {
    throw new Error('A public domain is required to derive the default support email.')
  }
  return `support@${hostname}`
}

export function validateLegalProfile(
  profile: LegalProfile,
  options: Readonly<{ requireReviewed?: boolean }> = {},
): ReadonlyArray<string> {
  const issues: string[] = []
  const requiredFields = {
    productName: profile.productName,
    operatorName: profile.operatorName,
    siteUrl: profile.siteUrl,
    contactEmail: profile.contactEmail,
    governingLaw: profile.governingLaw,
    internationalTransfers: profile.privacy.internationalTransfers,
  }

  for (const [field, value] of Object.entries(requiredFields)) {
    if (!value.trim()) issues.push(`Legal profile ${field} is required.`)
    if (/\b(?:todo|tbd|replace me|your company|your product|example\.com)\b/i.test(value)) {
      issues.push(`Legal profile ${field} still contains placeholder copy.`)
    }
  }

  try {
    const url = new URL(profile.siteUrl)
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('unsupported protocol')
    if (options.requireReviewed && url.protocol !== 'https:') {
      issues.push('Reviewed legal profiles require an HTTPS siteUrl.')
    }
  } catch {
    issues.push('Legal profile siteUrl must be an absolute HTTP(S) URL.')
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.contactEmail)) {
    issues.push('Legal profile contactEmail must be a valid email address.')
  }

  for (const [field, value] of [
    ['effectiveDate', profile.effectiveDate],
    ['lastUpdated', profile.lastUpdated],
  ] as const) {
    if (!isIsoDate(value)) issues.push(`Legal profile ${field} must use a valid YYYY-MM-DD date.`)
  }
  if (
    isIsoDate(profile.effectiveDate) &&
    isIsoDate(profile.lastUpdated) &&
    profile.lastUpdated < profile.effectiveDate
  ) {
    issues.push('Legal profile lastUpdated must not be earlier than effectiveDate.')
  }

  validateList('browserStorage', profile.privacy.browserStorage, issues)

  if (profile.privacy.processingActivities.length === 0) {
    issues.push('Legal profile processingActivities must not be empty.')
  }
  for (const activity of profile.privacy.processingActivities) {
    if (
      !activity.data.trim() ||
      !activity.purpose.trim() ||
      !activity.legalBasis.trim() ||
      !activity.retention.trim()
    ) {
      issues.push('Every processing activity requires data, purpose, legalBasis, and retention.')
    }
    validateList(
      `processing activity ${activity.data || 'unknown'} recipients`,
      activity.recipients,
      issues,
    )
  }
  const activityNames = profile.privacy.processingActivities.map((activity) =>
    activity.data.trim().toLowerCase(),
  )
  if (new Set(activityNames).size !== activityNames.length) {
    issues.push('Legal profile contains duplicate processing activity data labels.')
  }

  const providers = [
    ...profile.privacy.serviceProviders,
    ...(profile.features.analytics ? [profile.features.analytics] : []),
  ]
  for (const provider of providers) {
    if (!provider.name.trim() || !provider.purpose.trim()) {
      issues.push('Every declared legal provider requires a name and purpose.')
    }
  }
  if (profile.features.analytics) {
    const analytics = profile.features.analytics
    if (!analytics.data.trim() || !analytics.legalBasis.trim() || !analytics.retention.trim()) {
      issues.push('Analytics requires data, legalBasis, and retention disclosures.')
    }
  }

  if (options.requireReviewed && profile.reviewStatus !== 'reviewed') {
    issues.push('Legal profile must be reviewed before production launch.')
  }
  if (
    options.requireReviewed &&
    /\b(?:applicable|operator is established|operator's location)\b/i.test(profile.governingLaw)
  ) {
    issues.push('Reviewed legal profiles require a specific governingLaw jurisdiction.')
  }

  return Array.from(new Set(issues))
}

export function buildLegalDocument(
  kind: LegalDocument['kind'],
  profile: LegalProfile,
): LegalDocument {
  return kind === 'privacy' ? buildPrivacyDocument(profile) : buildTermsDocument(profile)
}

export function isLegalProfileLaunchReady(profile: LegalProfile): boolean {
  return validateLegalProfile(profile, { requireReviewed: true }).length === 0
}

function buildPrivacyDocument(profile: LegalProfile): LegalDocument {
  const analyticsParagraph = profile.features.analytics
    ? `${profile.features.analytics.name} is used only after the visitor grants analytics consent. It processes ${profile.features.analytics.data} for ${profile.features.analytics.purpose}, relies on ${profile.features.analytics.legalBasis}, and retains that information for ${profile.features.analytics.retention}.`
    : 'The Service does not currently use optional analytics.'
  const providers = uniqueProviders([
    ...profile.privacy.serviceProviders,
    ...(profile.features.analytics ? [profile.features.analytics] : []),
  ])

  return {
    kind: 'privacy',
    title: 'Privacy Policy',
    description: `This policy explains how ${profile.productName} handles information and which product capabilities affect that handling.`,
    sections: [
      {
        id: 'scope',
        title: '1. Scope and operator',
        paragraphs: [
          `${profile.operatorName} operates ${profile.productName} at ${profile.siteUrl}. This policy applies to the website and product experiences that link to it.`,
          'Supported tool inputs are processed in the browser. The local tool workflow does not intentionally upload or persist those inputs on the operator’s servers.',
        ],
      },
      {
        id: 'processing',
        title: '2. Information we process and why',
        paragraphs: [
          'Each processing activity is listed with its purpose, legal basis, retention rule, and recipients:',
        ],
        items: profile.privacy.processingActivities.map(formatProcessingActivity),
      },
      {
        id: 'browser-storage',
        title: '3. Cookies and analytics',
        paragraphs: [
          'The Service uses only the browser storage declared below. Optional analytics remains off until consent is granted.',
          analyticsParagraph,
        ],
        items: profile.privacy.browserStorage,
      },
      {
        id: 'providers',
        title: '4. Service providers and international processing',
        paragraphs: [
          'Service providers may process limited information on behalf of the operator. The Service does not sell personal information or share it for cross-context behavioral advertising.',
          profile.privacy.internationalTransfers,
        ],
        items: providers.map((provider) => `${provider.name}: ${provider.purpose}`),
      },
      {
        id: 'retention',
        title: '5. Retention',
        paragraphs: [
          'Retention is stated for each processing activity above. Browser-local tool inputs are not intentionally retained by the operator.',
        ],
      },
      {
        id: 'rights',
        title: '6. Your choices and rights',
        paragraphs: [
          `You may request access, correction, deletion, restriction, portability, or objection where applicable. You may withdraw optional analytics consent using the footer control. Send privacy requests to ${profile.contactEmail}.`,
        ],
      },
      {
        id: 'children',
        title: '7. Children',
        paragraphs: [
          `${profile.productName} is intended for a general audience and is not directed to children. The operator does not knowingly collect children’s personal information through the local tool workflow.`,
        ],
      },
      {
        id: 'changes-contact',
        title: '8. Changes and contact',
        paragraphs: [
          'Material changes will be reflected on this page by updating the date above. We will provide additional notice when required by the change or applicable law.',
          `For privacy questions or requests, contact ${profile.operatorName} at ${profile.contactEmail}.`,
        ],
      },
    ],
  }
}

function buildTermsDocument(profile: LegalProfile): LegalDocument {
  return {
    kind: 'terms',
    title: 'Terms of Service',
    description: `These terms set the rules for using ${profile.productName} and identify the product capabilities covered by the agreement.`,
    sections: [
      {
        id: 'acceptance',
        title: '1. Acceptance',
        paragraphs: [
          `By accessing or using ${profile.productName}, you agree to these terms and confirm that you can legally accept them. If you do not agree, do not use the Service.`,
        ],
      },
      {
        id: 'service',
        title: '2. The service',
        paragraphs: [
          `${profile.operatorName} provides ${profile.productName} as a free, account-free tool at ${profile.siteUrl}. Supported tool inputs are processed locally in the browser and are not intentionally uploaded or stored by the operator.`,
        ],
      },
      {
        id: 'acceptable-use',
        title: '3. Acceptable use',
        paragraphs: ['You may not misuse the service. In particular, you must not:'],
        items: [
          'break applicable law or violate another person’s rights;',
          'probe, disrupt, overload, or bypass security or usage controls;',
          'introduce malware or use the service to distribute harmful material;',
          'misrepresent affiliation with the operator or use the service for deceptive activity.',
        ],
      },
      {
        id: 'inputs-results',
        title: '4. Your inputs and results',
        paragraphs: [
          'Your inputs and generated results remain yours. You are responsible for having the right to use your inputs and for reviewing results before relying on or distributing them.',
        ],
      },
      {
        id: 'intellectual-property',
        title: '5. Intellectual property',
        paragraphs: [
          `${profile.productName}, its software, branding, and original content remain the property of ${profile.operatorName} or its licensors. These terms grant only a limited right to use the service as provided.`,
        ],
      },
      {
        id: 'availability',
        title: '6. Availability and changes',
        paragraphs: [
          'The Service may be changed, suspended, restricted to prevent misuse, or discontinued. The operator will use reasonable care but does not promise uninterrupted or error-free availability.',
        ],
      },
      {
        id: 'disclaimers-liability',
        title: '7. Disclaimers and limitation of liability',
        paragraphs: [
          'The Service is provided on an “as available” basis to the extent permitted by law. It is not professional, legal, financial, medical, or compliance advice, and results should be reviewed for their intended use.',
          'To the maximum extent permitted by applicable law, the operator is not liable for indirect, incidental, special, consequential, or punitive damages arising from use of the service. Rights that cannot lawfully be limited remain unaffected.',
        ],
      },
      {
        id: 'governing-law',
        title: '8. Governing law',
        paragraphs: [
          `These terms are governed by ${profile.governingLaw}, without overriding consumer protections that cannot be waived in your location.`,
        ],
      },
      {
        id: 'changes-contact',
        title: '9. Changes and contact',
        paragraphs: [
          'The updated date above identifies the current version. We will provide additional notice for material changes where appropriate, and continued use after the effective date means the revised terms apply.',
          `Questions about these terms may be sent to ${profile.contactEmail}.`,
        ],
      },
    ],
  }
}

function formatProcessingActivity(activity: LegalProcessingActivity): string {
  return `${withoutTrailingPunctuation(activity.data)} — Purpose: ${withoutTrailingPunctuation(activity.purpose)}; legal basis: ${withoutTrailingPunctuation(activity.legalBasis)}; retention: ${withoutTrailingPunctuation(activity.retention)}; recipients: ${activity.recipients.join(', ')}.`
}

function withoutTrailingPunctuation(value: string): string {
  return value.trim().replace(/[.;:]$/, '')
}

function uniqueProviders(providers: ReadonlyArray<LegalProvider>): LegalProvider[] {
  const byName = new Map<string, LegalProvider>()
  for (const provider of providers) {
    const key = provider.name.trim().toLowerCase()
    const existing = byName.get(key)
    byName.set(
      key,
      existing ? { ...existing, purpose: `${existing.purpose}; ${provider.purpose}` } : provider,
    )
  }
  return [...byName.values()]
}

function validateList(field: string, values: ReadonlyArray<string>, issues: string[]) {
  if (values.length === 0) issues.push(`Legal profile ${field} must not be empty.`)
  const normalized = values.map((value) => value.trim().toLowerCase())
  if (normalized.some((value) => !value))
    issues.push(`Legal profile ${field} contains an empty item.`)
  if (new Set(normalized).size !== normalized.length) {
    issues.push(`Legal profile ${field} contains duplicate items.`)
  }
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value)
}
