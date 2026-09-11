export const legalTemplateVersion = '0.1' as const

export type LegalTemplateKind = 'free-local-tool' | 'account-tool'

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
  templateKind: LegalTemplateKind
  productName: string
  siteUrl: string
  contactEmail: string
  effectiveDate: string
  lastUpdated: string
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

export function validateLegalProfile(profile: LegalProfile): ReadonlyArray<string> {
  const issues: string[] = []
  const requiredFields = {
    productName: profile.productName,
    siteUrl: profile.siteUrl,
    contactEmail: profile.contactEmail,
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

  return Array.from(new Set(issues))
}

export function buildLegalDocument(
  kind: LegalDocument['kind'],
  profile: LegalProfile,
): LegalDocument {
  return kind === 'privacy' ? buildPrivacyDocument(profile) : buildTermsDocument(profile)
}

function buildPrivacyDocument(profile: LegalProfile): LegalDocument {
  const usesAccounts = profile.templateKind === 'account-tool'
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
        title: '1. Scope',
        paragraphs: [
          `${profile.productName} is available at ${profile.siteUrl}. This policy applies to the website and product experiences that link to it.`,
          usesAccounts
            ? 'Original local media files are processed in the browser and are not uploaded in full. When a user requests recognition, the Service uploads a short audio sample to its recognition provider and stores the account, session, credit, and reward records described below.'
            : 'Supported tool inputs are processed in the browser. The local tool workflow does not intentionally upload or persist those inputs on TuneClue servers.',
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
          'Service providers may process limited information to deliver the Service. The Service does not sell personal information or share it for cross-context behavioral advertising.',
          profile.privacy.internationalTransfers,
        ],
        items: providers.map((provider) => `${provider.name}: ${provider.purpose}`),
      },
      {
        id: 'retention',
        title: '5. Retention',
        paragraphs: [
          usesAccounts
            ? 'Retention is stated for each processing activity above. Original local media files are not intentionally retained by TuneClue; short audio samples and account-related records follow the disclosed retention rules.'
            : 'Retention is stated for each processing activity above. Browser-local tool inputs are not intentionally retained by TuneClue.',
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
          usesAccounts
            ? `${profile.productName} is intended for a general audience and is not directed to children. TuneClue does not knowingly create accounts for or collect personal information from children.`
            : `${profile.productName} is intended for a general audience and is not directed to children. TuneClue does not knowingly collect children’s personal information through the local tool workflow.`,
        ],
      },
      {
        id: 'changes-contact',
        title: '8. Changes and contact',
        paragraphs: [
          'Material changes will be reflected on this page by updating the date above. We will provide additional notice when required by the change or applicable law.',
          `For privacy questions or requests, contact ${profile.productName} at ${profile.contactEmail}.`,
        ],
      },
    ],
  }
}

function buildTermsDocument(profile: LegalProfile): LegalDocument {
  if (profile.templateKind === 'account-tool') {
    return buildAccountToolTermsDocument(profile)
  }

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
          `${profile.productName} is provided as a free, account-free tool at ${profile.siteUrl}. Supported tool inputs are processed locally in the browser and are not intentionally uploaded or stored by the service.`,
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
          'misrepresent affiliation with the Service or use it for deceptive activity.',
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
          `${profile.productName}, its software, branding, and original content remain protected by applicable intellectual-property rights. These terms grant only a limited right to use the service as provided.`,
        ],
      },
      {
        id: 'availability',
        title: '6. Availability and changes',
        paragraphs: [
          'The Service may be changed, suspended, restricted to prevent misuse, or discontinued. TuneClue will use reasonable care but does not promise uninterrupted or error-free availability.',
        ],
      },
      {
        id: 'disclaimers-liability',
        title: '7. Disclaimers and limitation of liability',
        paragraphs: [
          'The Service is provided on an “as available” basis to the extent permitted by law. It is not professional, legal, financial, medical, or compliance advice, and results should be reviewed for their intended use.',
          'To the maximum extent permitted by applicable law, TuneClue is not liable for indirect, incidental, special, consequential, or punitive damages arising from use of the service. Rights that cannot lawfully be limited remain unaffected.',
        ],
      },
      {
        id: 'changes-contact',
        title: '8. Changes and contact',
        paragraphs: [
          'The updated date above identifies the current version. We will provide additional notice for material changes where appropriate, and continued use after the effective date means the revised terms apply.',
          `Questions about these terms may be sent to ${profile.contactEmail}.`,
        ],
      },
    ],
  }
}

function buildAccountToolTermsDocument(profile: LegalProfile): LegalDocument {
  return {
    kind: 'terms',
    title: 'Terms of Service',
    description: `These terms govern access to ${profile.productName}, including its account, song-recognition, and free or purchased credit features.`,
    sections: [
      {
        id: 'acceptance',
        title: '1. Acceptance',
        paragraphs: [
          `By accessing or using ${profile.productName}, you agree to these terms and the Privacy Policy and confirm that you can legally accept them. If you do not agree, do not use the Service.`,
        ],
      },
      {
        id: 'service',
        title: '2. The service',
        paragraphs: [
          `${profile.productName} is provided as an account-backed song-recognition tool at ${profile.siteUrl}. You may select a local audio or video file and choose a point to analyse. The browser prepares a short WAV sample; the original local file is not uploaded in full. The short sample is sent to a third-party recognition provider, and the Service returns available song metadata and listening links.`,
          'The Service does not provide video, audio, or song downloads and does not host, mirror, or redistribute the source media.',
        ],
      },
      {
        id: 'eligibility',
        title: '3. Eligibility',
        paragraphs: [
          'You must be legally able to accept these terms. If applicable law requires a parent or legal guardian to act for you, that person must review and accept these terms before you use an account or submit a recognition request.',
        ],
      },
      {
        id: 'accounts',
        title: '4. Accounts and security',
        paragraphs: [
          'Google sign-in is required when you run a song recognition. You are responsible for keeping access to your Google account secure and for activity performed through your TuneClue account. Contact TuneClue promptly if you believe the account has been used without permission.',
          `Revoking Google access prevents future Google sign-in but does not by itself delete records already stored by ${profile.productName}. To request account deletion or exercise an applicable privacy right, contact ${profile.contactEmail}.`,
        ],
      },
      {
        id: 'credits-rewards',
        title: '5. Recognition credits, purchases, and rewards',
        paragraphs: [
          'A new eligible Google account receives one welcome credit. Each recognition request consumes one credit after the request passes validation, whether the recognition provider finds a match or returns no match. When the provider cannot run because of a provider or configuration failure, TuneClue attempts to return the consumed credit through a separate refund entry.',
          'An authenticated user may receive one additional credit for opening TuneClue’s share composer for each supported platform. The reward is granted when the composer opens; TuneClue cannot verify whether the user publishes the post. Each supported platform reward may be claimed only once per account, for a current maximum of two share-intent credits.',
          'Free credits have no cash value, cannot be transferred or sold, and may not be obtained through duplicate accounts, automation, deception, or attempts to bypass usage controls.',
          'When enabled, paid credits are sold as one-time packs through Dodo Payments. The pack page shows its price and included recognition attempts; applicable tax is shown at checkout. This is not a subscription and does not automatically renew. Credits are assigned only after server-side payment confirmation. Test checkouts do not provide usable recognition credits.',
          'Purchased credits have no scheduled expiry under the current pack policy. They are tied to the purchasing TuneClue account, are not transferable, and are not a cash balance. One validated recognition attempt uses one credit even when no song is matched. Payment disputes can temporarily suspend the credits associated with that purchase.',
          `For duplicate charges, undelivered purchases, a refund request, or an applicable consumer right, contact ${profile.contactEmail} with the order number. Refunds are processed through Dodo Payments. A completed full refund reverses that pack’s credits; partial refunds reverse a proportion of the pack using cumulative rounding up to whole credits. Previously consumed credits can result in a negative account balance after reversal. Mandatory consumer rights are not limited by this policy.`,
          'If a payment dispute is resolved in the customer’s favour, or is otherwise not won or cancelled for the merchant, associated credits remain unavailable. A merchant win or cancellation restores only credits not already reversed for a completed refund.',
        ],
      },
      {
        id: 'acceptable-use',
        title: '6. Acceptable use',
        paragraphs: ['You may not misuse the Service. In particular, you must not:'],
        items: [
          'submit media that you have no right to access or process;',
          'use the Service to infringe copyright or other rights or to redistribute protected media unlawfully;',
          'probe, disrupt, overload, scrape, or reverse engineer the Service;',
          'bypass authentication, rate limits, credit rules, security controls, or anti-abuse measures;',
          'automate recognition or create multiple accounts to obtain additional free credits;',
          'introduce malware, impersonate another person, or use the Service for unlawful, fraudulent, harmful, or deceptive activity.',
        ],
      },
      {
        id: 'inputs-results',
        title: '7. Your inputs and recognition results',
        paragraphs: [
          'You retain any rights you hold in the media you select and are responsible for having permission to process it. TuneClue does not claim ownership of song recordings, recognition metadata, artwork, or external listening links; those materials remain subject to the rights of their respective owners.',
          'Recognition results may be incomplete, inaccurate, or unavailable, especially for short, noisy, modified, unpublished, or uncommon audio. You are responsible for reviewing a result before relying on or distributing it.',
        ],
      },
      {
        id: 'third-parties',
        title: '8. Third-party services',
        paragraphs: [
          'The Service relies on third parties including Google for authentication, AudD for music recognition, Cloudflare for hosting and account infrastructure, and Dodo Payments for hosted payment processing when credit purchases are available. Those providers may process limited information as described in the Privacy Policy and under their own applicable terms.',
          'Recognition results may include links to services such as Spotify, Apple Music, and Deezer. TuneClue does not control or guarantee the availability, content, pricing, or accuracy of any third-party service.',
        ],
      },
      {
        id: 'intellectual-property',
        title: '9. TuneClue intellectual property',
        paragraphs: [
          `${profile.productName}, its software, branding, interface, and original site content remain protected by applicable intellectual-property rights. These terms grant only a limited right to use the Service as provided; they do not grant a right to copy, resell, sublicense, or misrepresent the source of the Service.`,
        ],
      },
      {
        id: 'availability',
        title: '10. Availability and changes',
        paragraphs: [
          'The Service, its recognition providers, and its supported features may change, become unavailable, contain errors, or be suspended. TuneClue may apply reasonable limits or change free-credit rules prospectively to protect the Service, prevent abuse, or respond to provider constraints. Material changes will be communicated where appropriate.',
        ],
      },
      {
        id: 'termination',
        title: '11. Suspension, termination, and deletion',
        paragraphs: [
          'TuneClue may restrict or suspend access when reasonably necessary to investigate abuse, protect users or infrastructure, comply with law, or enforce these terms. You may stop using the Service at any time and may request account deletion through the contact address below. Before requesting deletion of an account with purchased credits or unsettled orders, contact support to resolve its purchases and any applicable refund rights. Necessary transaction records may be retained to meet applicable legal obligations; account deletion does not override those obligations.',
        ],
      },
      {
        id: 'disclaimers-liability',
        title: '12. Disclaimers and limitation of liability',
        paragraphs: [
          'The Service is provided on an “as available” basis to the extent permitted by law. TuneClue does not promise that recognition results will be accurate, complete, uninterrupted, secure, or suitable for a particular purpose.',
          'To the maximum extent permitted by applicable law, TuneClue is not liable for indirect, incidental, special, consequential, or punitive damages arising from use of or inability to use the Service, third-party services, or recognition results. Rights and responsibilities that cannot lawfully be limited remain unaffected.',
        ],
      },
      {
        id: 'changes-contact',
        title: '13. Changes and contact',
        paragraphs: [
          'The updated date above identifies the current version. We will provide additional notice for material changes where appropriate. Continued use after a change takes effect means the revised terms apply.',
          `Questions, account deletion requests, and legal notices may be sent to ${profile.contactEmail}.`,
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
