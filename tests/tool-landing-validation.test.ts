import { describe, expect, it } from 'vitest'
import type { ToolLandingConfig } from '@/components/tool-landing'
import { auditToolLandingConfig, validateToolLandingConfig } from '@/lib/tool-landing-validation'
import type { ToolRegistryItem } from '@/lib/tool-registry'

const registry = [
  { id: 'related', label: 'Related', href: '/related', status: 'live' },
  { id: 'planned', label: 'Planned', href: '/planned', status: 'planned' },
] satisfies ReadonlyArray<ToolRegistryItem>

function validConfig(): ToolLandingConfig {
  return {
    version: '0.2',
    preset: 'tool-default',
    toolId: 'current',
    locale: 'en',
    seo: {
      primaryKeyword: 'current online tool',
      title: 'Current Tool - Free Online Tool',
      description: 'Free online tool with no installation or signup required.',
      path: '/current',
      indexable: true,
    },
    hero: {
      title: 'Current Tool',
      description: 'Free online tool with no installation or signup required.',
    },
    experience: {
      free: true,
      online: true,
      installationRequired: false,
      signupRequired: false,
      processing: 'server',
    },
    completion: {
      highlights: ['First task', 'Second task', 'Third task'],
    },
    capabilities: {
      title: 'Capabilities',
      items: [{ id: 'one', title: 'First task', description: 'Does the first task.' }],
    },
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Current', href: '/current' },
    ],
    relatedTools: {
      title: 'Related tools',
      toolIds: ['related'],
    },
  }
}

describe('Tool Landing validation', () => {
  it('accepts a valid v0.2 config', () => {
    expect(validateToolLandingConfig(validConfig(), registry)).toEqual([])
  })

  it('requires a primary keyword only for indexable Tool Landing pages', () => {
    const indexable = validConfig()
    indexable.seo.primaryKeyword = undefined
    expect(validateToolLandingConfig(indexable, registry)).toContain(
      'Indexable Tool Landing pages require a primaryKeyword from the SEO brief.',
    )

    const noindex = validConfig()
    noindex.seo.primaryKeyword = undefined
    noindex.seo.indexable = false
    expect(validateToolLandingConfig(noindex, registry)).toEqual([])
  })

  it('enforces 3–5 completion highlights', () => {
    expect(
      validateToolLandingConfig(
        { ...validConfig(), completion: { highlights: ['Only one'] } },
        registry,
      ),
    ).toContain('Tool Landing v0.2 requires 3–5 completion highlights.')
  })

  it('rejects deprecated features and duplicate capability ids', () => {
    const config = validConfig()
    expect(
      validateToolLandingConfig(
        {
          ...config,
          features: {
            title: 'Features',
            items: [{ title: 'Legacy', description: 'Legacy feature.' }],
          },
          capabilities: {
            title: 'Capabilities',
            items: [
              { id: 'same', title: 'One', description: 'One.' },
              { id: 'same', title: 'Two', description: 'Two.' },
            ],
          },
        },
        registry,
      ),
    ).toEqual(
      expect.arrayContaining([
        'Tool Landing v0.2 must use capabilities instead of deprecated features.',
        'Duplicate capability id: same',
      ]),
    )
  })

  it('rejects bad Related Tool ids', () => {
    expect(
      validateToolLandingConfig(
        {
          ...validConfig(),
          relatedTools: {
            title: 'Related tools',
            toolIds: ['current', 'related', 'related', 'planned', 'missing'],
          },
        },
        registry,
      ),
    ).toEqual(
      expect.arrayContaining([
        'Related Tools must not include the current tool id.',
        'Duplicate Related Tool id: related',
        'Related Tool planned is not live.',
        'Unknown Related Tool id: missing',
      ]),
    )
  })

  it('keeps SEO guidance as warnings without breaking the legacy validator', () => {
    const config = validConfig()
    config.seo.primaryKeyword = 'invoice generator'

    const audit = auditToolLandingConfig(config, registry)
    expect(audit.errors).toEqual([])
    expect(audit.warnings.map((issue) => issue.code)).toContain('seo.primary-keyword.title')
    expect(validateToolLandingConfig(config, registry)).toEqual([])
  })

  it('returns hard SEO metadata failures through the legacy validator', () => {
    const config = validConfig()
    config.seo = { ...config.seo, title: '', description: '', path: 'current?preview=1' }

    expect(validateToolLandingConfig(config, registry)).toEqual(
      expect.arrayContaining([
        'SEO title is required.',
        'SEO description is required.',
        'Tool SEO path must be an absolute site path starting with "/".',
      ]),
    )
  })
})
