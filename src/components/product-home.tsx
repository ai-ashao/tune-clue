import type { Locale } from '@/i18n/config'
import { productHomeMessages } from '@/i18n/product-home-messages'
import { productConfig } from '@/lib/product-config'
import { localizedPageHead } from '@/lib/seo'
import { SaasStarterHome } from './saas-starter-home'
import { ToolStarterHome, toolStarterConfig } from './tool-starter-home'

export function ProductHome({ locale }: Readonly<{ locale: Locale }>) {
  return productConfig.mode === 'tool' ? (
    <ToolStarterHome locale={locale} />
  ) : (
    <SaasStarterHome locale={locale} />
  )
}

export function productHomeHead(locale: Locale) {
  if (productConfig.mode === 'tool') {
    const config = toolStarterConfig(locale)
    return localizedPageHead({
      pageId: 'home',
      locale,
      title: config.seo.title,
      description: config.seo.description,
      socialImage: config.seo.socialImage,
    })
  }

  const meta = productHomeMessages[locale].meta
  return localizedPageHead({
    pageId: 'home',
    locale,
    title: meta.saasTitle,
    description: meta.saasDescription,
  })
}
