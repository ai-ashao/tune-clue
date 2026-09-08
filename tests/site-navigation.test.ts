import { describe, expect, it } from 'vitest'
import type { SiteNavigationConfig } from '@/lib/site-navigation'
import {
  resolveFooterToolGroups,
  validateSiteNavigation,
  validateToolSiteNavigation,
} from '@/lib/site-navigation'
import type { ToolRegistryItem } from '@/lib/tool-registry'

const registry = [
  {
    id: 'resize',
    label: 'Image Resizer',
    href: '/image-resizer',
    tags: ['image'],
    status: 'live' as const,
    localizations: {
      'zh-CN': { label: '图片尺寸调整', href: '/zh/image-resizer' },
    },
  },
  {
    id: 'compress',
    label: 'Image Compressor',
    href: '/image-compressor',
    tags: ['image'],
    status: 'live' as const,
  },
  {
    id: 'planned',
    label: 'Planned Tool',
    href: '/planned',
    status: 'planned' as const,
  },
] satisfies ReadonlyArray<ToolRegistryItem>

function config(overrides: Partial<SiteNavigationConfig> = {}): SiteNavigationConfig {
  return {
    guidesPlacement: 'footer',
    header: {
      links: ['tools'],
      toolsHref: { en: '/tools', 'zh-CN': '/zh/tools' },
    },
    footer: {
      toolGroups: [
        {
          id: 'image',
          title: { en: 'Image tools', 'zh-CN': '图片工具' },
          toolIds: ['resize', 'compress'],
          viewMore: {
            label: { en: 'View more', 'zh-CN': '查看更多' },
            href: { en: '/tools/images', 'zh-CN': '/zh/tools/images' },
          },
        },
      ],
      secondaryPages: ['about', 'contact', 'privacy', 'terms'],
    },
    ...overrides,
  }
}

describe('site navigation', () => {
  it('keeps Guides in exactly the configured primary navigation area', () => {
    expect(validateSiteNavigation(config(), registry)).toEqual([])

    expect(
      validateSiteNavigation(
        {
          ...config(),
          guidesPlacement: 'footer',
          header: { ...config().header, links: ['tools', 'guides'] },
        },
        registry,
      ),
    ).toContain('Guides must not appear in the header when placement is footer or none.')
  })

  it('requires a tools destination when Tools is in the header', () => {
    expect(
      validateSiteNavigation({ ...config(), header: { links: ['tools'] } }, registry),
    ).toContain('Header includes tools but no toolsHref is configured.')
  })

  it('resolves only live footer tools and localizes available labels', () => {
    const groups = resolveFooterToolGroups({ config: config(), registry, locale: 'zh-CN' })
    expect(groups).toHaveLength(1)
    expect(groups[0]?.title).toBe('图片工具')
    expect(groups[0]?.tools.map((tool) => tool.id)).toEqual(['resize', 'compress'])
    expect(groups[0]?.tools[0]?.label).toBe('图片尺寸调整')
    expect(groups[0]?.viewMore).toEqual({ label: '查看更多', href: '/zh/tools/images' })
  })

  it('fails validation for unknown and planned footer destinations', () => {
    const invalid = config({
      footer: {
        ...config().footer,
        toolGroups: [
          {
            id: 'image',
            title: { en: 'Image tools' },
            toolIds: ['resize', 'planned', 'missing'],
          },
        ],
      },
    })

    expect(validateSiteNavigation(invalid, registry)).toEqual(
      expect.arrayContaining([
        'Footer group image references non-live tool id: planned',
        'Footer group image references unknown tool id: missing',
      ]),
    )
  })

  it('caps the default directory at four groups and six links per group', () => {
    const tooManyGroups = Array.from({ length: 5 }, (_, index) => ({
      id: `g${index}`,
      title: { en: `Group ${index}` },
      toolIds: ['resize'],
    }))

    expect(
      validateSiteNavigation(
        { ...config(), footer: { ...config().footer, toolGroups: tooManyGroups } },
        registry,
      ),
    ).toContain('Footer tool directory supports at most four default groups.')

    expect(
      validateSiteNavigation(
        {
          ...config(),
          footer: {
            ...config().footer,
            toolGroups: [
              {
                id: 'oversized',
                title: { en: 'Oversized' },
                toolIds: ['resize'],
                maxItems: 7,
              },
            ],
          },
        },
        registry,
      ),
    ).toContain('Footer group oversized must not show more than six tool links.')
  })

  it('rejects leftover starter links in Tool-site mode', () => {
    expect(
      validateToolSiteNavigation(
        {
          ...config(),
          header: {
            links: ['tools', 'workflow', 'pricing'],
            toolsHref: { en: '/tools' },
          },
        },
        registry,
      ),
    ).toEqual(
      expect.arrayContaining([
        'Tool-site Header must not retain the starter Workflow link.',
        'Tool-site Header must not retain Pricing unless the product explicitly overrides the Tool-site default.',
      ]),
    )
  })
})
