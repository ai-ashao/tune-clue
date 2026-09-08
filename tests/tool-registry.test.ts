import { describe, expect, it } from 'vitest'
import {
  findToolRouteByPath,
  resolveRelatedTools,
  type ToolRegistryItem,
  toolHreflangAlternates,
  toolLocaleAlternatesForPath,
  toolSitemapPaths,
  validateToolRegistry,
} from '@/lib/tool-registry'

const registry = [
  {
    id: 'current',
    label: 'Current Tool',
    href: '/current',
    tags: ['image', 'resize'],
    status: 'live',
    indexable: true,
    localizations: {
      'zh-CN': { label: '当前工具', href: '/zh/current' },
    },
  },
  {
    id: 'closest',
    label: 'Closest Tool',
    href: '/closest',
    tags: ['image', 'resize'],
    status: 'live',
    indexable: true,
    localizations: {
      'zh-CN': { label: '最相关工具', href: '/zh/closest' },
    },
  },
  {
    id: 'other',
    label: 'Other Tool',
    href: '/other',
    tags: ['text'],
    status: 'live',
    indexable: true,
  },
  {
    id: 'live-noindex',
    label: 'Live Noindex Tool',
    href: '/live-noindex',
    tags: ['image'],
    status: 'live',
  },
  {
    id: 'planned',
    label: 'Planned Tool',
    href: '/planned',
    tags: ['image', 'resize'],
    status: 'planned',
  },
] satisfies ReadonlyArray<ToolRegistryItem>

describe('tool registry', () => {
  it('resolves explicitly requested live tools in the requested locale', () => {
    const related = resolveRelatedTools({
      registry,
      currentToolId: 'current',
      requestedIds: ['closest', 'planned', 'missing'],
      locale: 'zh-CN',
    })
    expect(related.map((tool) => tool.id)).toEqual(['closest'])
    expect(related[0]?.label).toBe('最相关工具')
    expect(related[0]?.href).toBe('/zh/closest')
  })

  it('uses only positive tag relevance for automatic Related Tools', () => {
    expect(
      resolveRelatedTools({ registry, currentToolId: 'current' }).map((tool) => tool.id),
    ).toEqual(['closest', 'live-noindex'])
    expect(
      resolveRelatedTools({ registry, currentToolId: 'other' }).map((tool) => tool.id),
    ).toEqual([])
  })

  it('rejects duplicate registry ids and planned indexable tools', () => {
    expect(validateToolRegistry([...registry, registry[0] as ToolRegistryItem])).toContain(
      'Duplicate tool registry id: current',
    )
    expect(
      validateToolRegistry([
        ...registry,
        {
          id: 'bad-planned',
          label: 'Bad Planned',
          href: '/bad-planned',
          status: 'planned',
          indexable: true,
        },
      ]),
    ).toContain('Tool bad-planned cannot be indexable until its status is live.')
  })

  it('uses localized routes for switching and hreflang', () => {
    expect(findToolRouteByPath(registry, '/zh/current')).toMatchObject({
      locale: 'zh-CN',
      path: '/zh/current',
    })

    expect(toolLocaleAlternatesForPath(registry, '/current')).toEqual([
      expect.objectContaining({ locale: 'zh-CN', path: '/zh/current' }),
    ])

    expect(toolHreflangAlternates(registry, 'current')).toEqual([
      { locale: 'en', path: '/current' },
      { locale: 'zh-CN', path: '/zh/current' },
      { locale: 'x-default', path: '/current' },
    ])
  })

  it('requires explicit indexable=true before a live tool enters sitemap', () => {
    expect(toolSitemapPaths(registry)).toEqual(
      expect.arrayContaining(['/current', '/zh/current', '/closest', '/zh/closest', '/other']),
    )
    expect(toolSitemapPaths(registry)).not.toContain('/planned')
    expect(toolSitemapPaths(registry)).not.toContain('/live-noindex')
  })
})
