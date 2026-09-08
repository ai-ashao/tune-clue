import { describe, expect, it } from 'vitest'
import { productConfig, validateProductConfig } from '@/lib/product-config'
import { validateToolRegistry } from '@/lib/tool-registry'
import { validateToolSeoBrief } from '@/lib/tool-seo-brief'
import { toolRegistry } from '@/modules/tool-registry'
import { toolSeoBrief } from '@/modules/tool-seo-brief'

describe('TuneClue product contracts', () => {
  it('uses Tool Mode with valid product identity', () => {
    expect(productConfig.mode).toBe('tool')
    expect(validateProductConfig(productConfig)).toEqual([])
  })

  it('has a ready SEO brief', () => {
    expect(validateToolSeoBrief(toolSeoBrief)).toEqual([])
  })

  it('has a valid registry', () => {
    expect(validateToolRegistry(toolRegistry)).toEqual([])
  })
})
