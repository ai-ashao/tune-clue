import { describe, expect, it } from 'vitest'
import { type ProductConfig, productConfig } from '@/lib/product-config'
import { validateSeoFirstState } from '@/lib/seo-first-validation'
import {
  type ToolSeoBrief,
  validateToolSeoBrief,
  validateToolSeoBriefForProduct,
} from '@/lib/tool-seo-brief'

const readyBrief: ToolSeoBrief = {
  status: 'ready',
  primaryKeyword: 'threads downloader',
  localizedPrimaryKeywords: {
    'zh-CN': 'Threads 下载器',
  },
  searchIntent: 'download',
  primaryPage: '/',
  supportingKeywords: ['threads video downloader', 'download threads video'],
  firstBatchPages: [
    { keyword: 'threads downloader', path: '/', pageType: 'tool', locale: 'en' },
    {
      keyword: 'threads video downloader',
      path: '/threads-video-downloader',
      pageType: 'tool',
      locale: 'en',
    },
  ],
  locales: ['en'],
  evidence: [{ source: 'manual SERP review', note: 'Tool intent dominates the first page.' }],
}

describe('Tool SEO Brief contract', () => {
  it('accepts a compact research-backed SEO brief', () => {
    expect(validateToolSeoBrief(readyBrief)).toEqual([])
  })

  it('requires a ready brief before Tool Mode can pass', () => {
    const toolConfig = { ...productConfig, mode: 'tool' } satisfies ProductConfig
    expect(validateToolSeoBriefForProduct(toolConfig, null)).toEqual([
      'Tool Mode requires a ready Tool SEO Brief before the product can pass the SEO-first contract.',
    ])
    expect(validateToolSeoBriefForProduct(toolConfig, readyBrief)).toEqual([])
  })

  it('does not impose the Tool SEO Brief on SaaS Mode', () => {
    const saasConfig = { ...productConfig, mode: 'saas' } satisfies ProductConfig
    expect(validateToolSeoBriefForProduct(saasConfig, null)).toEqual([])
  })

  it('rejects briefs without page-map or evidence grounding', () => {
    const invalid: ToolSeoBrief = {
      ...readyBrief,
      firstBatchPages: [],
      evidence: [],
    }
    expect(validateToolSeoBrief(invalid)).toEqual(
      expect.arrayContaining([
        'Tool SEO Brief requires at least one first-batch page.',
        'Tool SEO Brief requires at least one research evidence item.',
      ]),
    )
  })

  it('requires declared locale keyword coverage', () => {
    const invalid: ToolSeoBrief = {
      ...readyBrief,
      locales: ['en', 'zh-CN'],
      localizedPrimaryKeywords: {},
    }
    expect(validateToolSeoBrief(invalid)).toContain(
      'Tool SEO Brief requires a primary keyword for locale: zh-CN',
    )
  })

  it('blocks indexable Guides while starter guide slugs remain', () => {
    const config = {
      ...productConfig,
      mode: 'saas',
      surfaces: {
        ...productConfig.surfaces,
        guides: true,
      },
    } satisfies ProductConfig

    expect(
      validateSeoFirstState({
        config,
        brief: null,
        guideSlugs: ['build-with-the-skill', 'real-product-guide'],
      }),
    ).toContain(
      'Guides cannot be indexable while ShipLean starter guide content remains: build-with-the-skill',
    )

    expect(
      validateSeoFirstState({
        config,
        brief: null,
        guideSlugs: ['real-product-guide'],
      }),
    ).toEqual([])
  })
})
