import { describe, expect, it } from 'vitest'
import type { ToolLandingConfig } from '@/components/tool-landing'
import { buildToolStructuredData } from '@/lib/tool-structured-data'

const config: ToolLandingConfig = {
  version: '0.1',
  preset: 'tool-default',
  toolId: 'resize-kb',
  seo: {
    title: 'Resize Image to KB - Free Online Tool',
    description: 'Free online tool to resize images to a target KB size.',
    path: '/resize-image-to-kb',
  },
  hero: {
    title: 'Resize Image to KB',
    description: 'Resize images online for free. No installation or signup required.',
  },
  experience: {
    free: true,
    online: true,
    installationRequired: false,
    signupRequired: false,
    processing: 'local',
  },
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Resize Image to KB', href: '/resize-image-to-kb' },
  ],
  faq: {
    title: 'FAQ',
    items: [
      {
        question: 'Is it free?',
        answer: 'Yes.',
      },
    ],
  },
}

const site = {
  name: 'Example',
  url: 'https://example.com',
}

describe('tool structured data', () => {
  it('emits WebApplication, FAQPage and BreadcrumbList when visible', () => {
    const data = buildToolStructuredData(config, site)

    expect(data.map((item) => item['@type'])).toEqual([
      'WebApplication',
      'FAQPage',
      'BreadcrumbList',
    ])

    const application = data[0]
    expect(application.offers).toEqual({
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    })
  })

  it('does not emit a free offer for a paid tool', () => {
    const data = buildToolStructuredData(
      {
        ...config,
        experience: {
          ...config.experience,
          free: false,
        },
      },
      site,
    )

    expect(data[0]).not.toHaveProperty('offers')
  })

  it('does not emit FAQPage when no visible FAQ exists', () => {
    const data = buildToolStructuredData(
      {
        ...config,
        faq: undefined,
      },
      site,
    )

    expect(data.map((item) => item['@type'])).not.toContain('FAQPage')
  })

  it('does not emit BreadcrumbList when no visible breadcrumb exists', () => {
    const data = buildToolStructuredData(
      {
        ...config,
        breadcrumbs: undefined,
      },
      site,
    )

    expect(data.map((item) => item['@type'])).not.toContain('BreadcrumbList')
  })
})
