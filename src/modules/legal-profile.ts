import { publicEnv } from '@/lib/config/env'
import { defaultSupportEmailForSite, defineLegalProfile, legalTemplateVersion } from '@/lib/legal'
import { site } from '@/lib/site'

const starterFallbackSiteUrl = 'https://starter.invalid'
const analytics = publicEnv.ga4Id
  ? {
      name: 'Google Analytics 4',
      data: 'consent-based device and product usage information',
      purpose: 'aggregated product usage measurement',
      legalBasis: 'the visitor’s consent',
      retention: 'the period configured for TuneClue in Google Analytics',
    }
  : false

export const legalProfile = defineLegalProfile({
  templateVersion: legalTemplateVersion,
  templateKind: 'account-tool',
  productName: site.name,
  siteUrl: site.url,
  contactEmail: defaultSupportEmailForSite(site.url, { fallbackSiteUrl: starterFallbackSiteUrl }),
  effectiveDate: '2026-09-03',
  lastUpdated: '2026-09-11',
  features: { analytics },
  privacy: {
    processingActivities: [
      {
        data: 'Account email and optional name, TuneClue order and pack identifiers, and payment, refund, and dispute status returned by Dodo Payments.',
        purpose:
          'create a hosted checkout and deliver purchased recognition credits to the correct account.',
        legalBasis:
          'providing a purchase requested by the user and meeting applicable accounting, security, and legal obligations.',
        retention:
          'only as long as required to fulfill orders, reconcile credits, handle disputes, and meet applicable legal obligations.',
        recipients: ['Dodo Payments', site.name, 'Cloudflare'],
      },
      {
        data: 'Technical request information, such as IP address, user agent, timestamps, and requested URLs.',
        purpose: 'deliver pages, maintain security, diagnose failures, and prevent abuse.',
        legalBasis:
          'providing the requested Service and TuneClue’s legitimate interests in security and reliability, where permitted.',
        retention:
          'only as long as needed for delivery, security, abuse prevention, or applicable legal obligations.',
        recipients: ['Cloudflare'],
      },
      {
        data: 'Google account identifier, email address, and basic profile name returned during Google sign-in.',
        purpose:
          'create a recoverable TuneClue account, keep the user signed in, and attach credits and rewards to that account.',
        legalBasis: 'providing the account and song-recognition service requested by the user.',
        retention:
          'for as long as the account is active or as needed for security, accounting, and applicable legal obligations.',
        recipients: ['Google', 'Cloudflare'],
      },
      {
        data: 'Credit ledger entries, purchase and refund records, payment-provider identifiers, and one-time social sharing reward claims.',
        purpose:
          'track free and purchased recognition access, recognition usage, payment delivery, refunds, disputes, and optional share-intent rewards.',
        legalBasis:
          'providing the requested Service and TuneClue’s legitimate interests in preventing duplicate rewards and abuse, where permitted.',
        retention:
          'for as long as needed to maintain account balances, prevent duplicate rewards, and meet applicable legal obligations.',
        recipients: [site.name, 'Cloudflare'],
      },
      {
        data: 'Support messages and contact details that a user chooses to provide.',
        purpose: 'respond to support and privacy requests.',
        legalBasis:
          'responding to the user’s request and TuneClue’s legitimate interests in supporting the Service, where permitted.',
        retention:
          'only as long as needed to resolve the request and meet applicable legal obligations.',
        recipients: [site.name],
      },
      {
        data: 'A short audio sample created from the point the user selects in a local media file.',
        purpose: 'identify the song and return available track metadata and listening links.',
        legalBasis: 'providing the song-recognition request initiated by the user.',
        retention:
          'TuneClue does not intentionally retain the short sample after the request completes. AudD processes the sample under its own applicable terms and privacy practices.',
        recipients: ['AudD'],
      },
      ...(analytics
        ? [
            {
              data: analytics.data,
              purpose: analytics.purpose,
              legalBasis: analytics.legalBasis,
              retention: analytics.retention,
              recipients: [analytics.name],
            },
          ]
        : []),
    ],
    browserStorage: [
      'An analytics consent preference stored in local browser storage.',
      'A short-lived locally prepared recognition sample may be stored in IndexedDB while completing Google sign-in or purchasing credits. Billing resume data is limited to a short sample or public TikTok URL, bound to the signed-in account, expires after 30 minutes, and is removed when restored. Full local media files are not saved for payment redirects.',
      'A checkout request identifier is stored temporarily in session storage to avoid duplicate checkout creation.',
    ],
    serviceProviders: [
      {
        name: 'Cloudflare',
        purpose:
          'website hosting, request delivery, security, operational infrastructure, and D1 account/credit storage',
      },
      { name: 'Google', purpose: 'Google account authentication' },
      {
        name: 'Dodo Payments',
        purpose:
          'hosted payment processing, merchant-of-record services, payment notifications, and refund or dispute handling when credit purchases are available',
      },
      {
        name: 'AudD',
        purpose: 'music recognition for the short audio sample submitted by the user',
      },
    ],
    internationalTransfers:
      'These providers may process information in countries other than the user’s country. Appropriate safeguards required by applicable law will be used for those transfers.',
  },
})
