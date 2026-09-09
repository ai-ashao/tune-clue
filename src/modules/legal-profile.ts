import { publicEnv } from '@/lib/config/env'
import { defaultSupportEmailForSite, defineLegalProfile, legalTemplateVersion } from '@/lib/legal'
import { site } from '@/lib/site'

const starterFallbackSiteUrl = 'https://starter.invalid'
const operatorName = site.name
const analytics = publicEnv.ga4Id
  ? {
      name: 'Google Analytics 4',
      data: 'consent-based device and product usage information',
      purpose: 'aggregated product usage measurement',
      legalBasis: 'the visitor’s consent',
      retention: 'the period configured by the operator in Google Analytics',
    }
  : false

export const legalProfile = defineLegalProfile({
  templateVersion: legalTemplateVersion,
  templateKind: 'account-tool-starter',
  reviewStatus: 'starter',
  productName: site.name,
  operatorName,
  siteUrl: site.url,
  contactEmail: defaultSupportEmailForSite(site.url, { fallbackSiteUrl: starterFallbackSiteUrl }),
  effectiveDate: '2026-09-03',
  lastUpdated: '2026-09-09',
  governingLaw: 'the laws applicable where the product operator is established',
  features: { analytics },
  privacy: {
    processingActivities: [
      {
        data: 'Technical request information, such as IP address, user agent, timestamps, and requested URLs.',
        purpose: 'deliver pages, maintain security, diagnose failures, and prevent abuse.',
        legalBasis:
          'providing the requested Service and the operator’s legitimate interests in security and reliability, where permitted.',
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
        data: 'Credit ledger entries and one-time social sharing reward claims.',
        purpose:
          'track free recognition access, recognition usage, refunds, and optional share-intent rewards.',
        legalBasis:
          'providing the requested Service and the operator’s legitimate interests in preventing duplicate rewards and abuse, where permitted.',
        retention:
          'for as long as needed to maintain account balances, prevent duplicate rewards, and meet applicable legal obligations.',
        recipients: [operatorName, 'Cloudflare'],
      },
      {
        data: 'Support messages and contact details that a user chooses to provide.',
        purpose: 'respond to support and privacy requests.',
        legalBasis:
          'responding to the user’s request and the operator’s legitimate interests in supporting the Service, where permitted.',
        retention:
          'only as long as needed to resolve the request and meet applicable legal obligations.',
        recipients: [operatorName],
      },
      {
        data: 'A short audio sample created from the point the user selects in a local media file.',
        purpose: 'identify the song and return available track metadata and listening links.',
        legalBasis: 'providing the song-recognition request initiated by the user.',
        retention:
          'subject to the recognition provider terms and the operator configuration; this must be verified before launch.',
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
      'A short-lived locally prepared recognition sample may be stored in IndexedDB only while completing a Google sign-in redirect, then removed when the song search resumes.',
    ],
    serviceProviders: [
      {
        name: 'Cloudflare',
        purpose:
          'website hosting, request delivery, security, operational infrastructure, and D1 account/credit storage',
      },
      { name: 'Google', purpose: 'Google account authentication' },
      {
        name: 'AudD',
        purpose: 'music recognition for the short audio sample submitted by the user',
      },
    ],
    internationalTransfers:
      'These providers may process information in countries other than the user’s country. The operator will use the safeguards required by applicable law for those transfers.',
  },
})
