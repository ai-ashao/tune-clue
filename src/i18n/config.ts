export const localeConfig = {
  en: {
    htmlLang: 'en',
    label: 'English',
    shortLabel: 'EN',
    pathPrefix: '',
  },
  'zh-CN': {
    htmlLang: 'zh-CN',
    label: '简体中文',
    shortLabel: '中',
    pathPrefix: 'zh',
  },
} as const

export type Locale = keyof typeof localeConfig

export const defaultLocale = 'en' satisfies Locale
export const supportedLocales = Object.keys(localeConfig) as Locale[]

export function localeFromPathname(pathname: string): Locale {
  const firstSegment = pathname.split(/[?#]/, 1)[0]?.split('/').filter(Boolean)[0]
  return (
    supportedLocales.find((locale) => localeConfig[locale].pathPrefix === firstSegment) ||
    defaultLocale
  )
}
