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
  templateKind: 'free-local-tool',
  reviewStatus: 'starter',
  productName: site.name,
  operatorName,
  siteUrl: site.url,
  contactEmail: defaultSupportEmailForSite(site.url, {
    fallbackSiteUrl: starterFallbackSiteUrl,
  }),
  effectiveDate: '2026-09-03',
  lastUpdated: '2026-09-03',
  governingLaw: 'the laws applicable where the product operator is established',
  features: {
    analytics,
  },
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
        data: 'Support messages and contact details that a user chooses to provide.',
        purpose: 'respond to support and privacy requests.',
        legalBasis:
          'responding to the user’s request and the operator’s legitimate interests in supporting the Service, where permitted.',
        retention:
          'only as long as needed to resolve the request and meet applicable legal obligations.',
        recipients: [operatorName],
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
    browserStorage: ['An analytics consent preference stored in local browser storage.'],
    serviceProviders: [
      {
        name: 'Cloudflare',
        purpose: 'website hosting, request delivery, security, and operational infrastructure',
      },
    ],
    internationalTransfers:
      'These providers may process information in countries other than the user’s country. The operator will use the safeguards required by applicable law for those transfers.',
  },
})
