import type { Locale } from '@/i18n/config'
import { productHomeMessages } from '@/i18n/product-home-messages'
import { productConfig } from '@/lib/product-config'
import { localizedPageHead, pageHead } from '@/lib/seo'
import { SaasStarterHome } from './saas-starter-home'
import { TuneClueHome, tuneClueHomeConfig } from './tuneclue/home'

export function ProductHome({ locale }: Readonly<{ locale: Locale }>) {
  if (productConfig.mode === 'tool') {
    return locale === 'en' ? <TuneClueHome /> : null
  }
  return <SaasStarterHome locale={locale} />
}

export function productHomeHead(locale: Locale) {
  if (productConfig.mode === 'tool') {
    if (locale !== 'en') {
      return pageHead({
        title: 'TuneClue',
        description: productConfig.brand.description,
        path: '/',
        indexable: false,
      })
    }
    return pageHead({
      title: tuneClueHomeConfig.seo.title,
      description: tuneClueHomeConfig.seo.description,
      path: tuneClueHomeConfig.seo.path,
      indexable: tuneClueHomeConfig.seo.indexable,
      socialImage: tuneClueHomeConfig.seo.socialImage,
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
