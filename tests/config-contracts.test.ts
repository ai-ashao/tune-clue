import { describe, expect, it } from 'vitest'
import { toolStarterConfig } from '@/components/tool-starter-home'
import { isPublicPageIndexable } from '@/i18n/routes'
import { validateLegalProfile } from '@/lib/legal'
import { productConfig, productSurfaceEnabled, validateProductConfig } from '@/lib/product-config'
import { validateSeoFirstProductState } from '@/lib/seo-first-validation'
import {
  saasSiteNavigation,
  siteNavigation,
  toolSiteNavigation,
  validateSaasSiteNavigation,
  validateSiteNavigation,
  validateToolSiteNavigation,
} from '@/lib/site-navigation'
import { validateToolLandingConfig } from '@/lib/tool-landing-validation'
import { validateToolRegistry } from '@/lib/tool-registry'
import { legalProfile } from '@/modules/legal-profile'
import { toolReferenceConfigs } from '@/modules/tool-reference-configs'
import { toolRegistry } from '@/modules/tool-registry'

describe('real configuration contracts', () => {
  it('keeps the checked-in product config structurally valid', () => {
    expect(validateProductConfig(productConfig)).toEqual([])
  })

  it('keeps the checked-in SEO-first product state valid', () => {
    expect(validateSeoFirstProductState()).toEqual([])
  })

  it('keeps public surface indexability aligned with product configuration', () => {
    expect(isPublicPageIndexable('pricing')).toBe(productSurfaceEnabled('pricing'))
    expect(isPublicPageIndexable('guides')).toBe(productSurfaceEnabled('guides'))
  })

  it('keeps the checked-in legal profile structurally valid', () => {
    expect(validateLegalProfile(legalProfile)).toEqual([])
  })

  it('keeps both base product-mode navigation contracts valid', () => {
    expect(validateSiteNavigation(siteNavigation, toolRegistry)).toEqual([])
    expect(validateSaasSiteNavigation(saasSiteNavigation, toolRegistry)).toEqual([])
    expect(validateToolSiteNavigation(toolSiteNavigation, toolRegistry)).toEqual([])
  })

  it('keeps the checked-in Tool Registry internally valid', () => {
    expect(validateToolRegistry(toolRegistry)).toEqual([])
  })

  it('keeps every checked-in Tool Landing reference config valid', () => {
    for (const config of toolReferenceConfigs) {
      expect(validateToolLandingConfig(config, toolRegistry)).toEqual([])
    }
  })

  it('keeps the Tool-mode homepage config valid in every shipped locale', () => {
    expect(validateToolLandingConfig(toolStarterConfig('en'), toolRegistry)).toEqual([])
    expect(validateToolLandingConfig(toolStarterConfig('zh-CN'), toolRegistry)).toEqual([])
  })
})
