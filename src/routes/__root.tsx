import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
  useRouterState,
} from '@tanstack/react-router'
import { ChevronDown, Globe2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { SiteFooter } from '@/components/site-footer'
import { Button } from '@/components/ui/button'
import { type Locale, localeConfig, localeFromPathname } from '@/i18n/config'
import { shellMessages } from '@/i18n/messages'
import { localeAlternatesForPath, localizedPathOrDefault } from '@/i18n/routes'
import { publicEnv } from '@/lib/config/env'
import { productConfig, surfaceModeForPath } from '@/lib/product-config'
import { site } from '@/lib/site'
import {
  type HeaderLinkId,
  localizedNavigationValue,
  type SiteNavigationConfig,
  siteNavigationForMode,
} from '@/lib/site-navigation'
import styles from '@/styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: site.name },
      ...(publicEnv.googleSiteVerification
        ? [{ name: 'google-site-verification', content: publicEnv.googleSiteVerification }]
        : []),
    ],
    links: [{ rel: 'stylesheet', href: styles }],
  }),
  component: RootComponent,
  shellComponent: RootDocument,
  notFoundComponent: NotFound,
})

function RootComponent() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const locale = localeFromPathname(pathname)
  const copy = shellMessages[locale]
  const localeAlternates = localeAlternatesForPath(pathname)
  const surfaceMode = surfaceModeForPath(pathname)
  const navigation = siteNavigationForMode(surfaceMode)

  const nav = navigation.header.links.flatMap((linkId) => {
    if (linkId === 'guides' && navigation.guidesPlacement !== 'header') return []

    const resolved = resolveHeaderLink(linkId, locale, navigation)
    return resolved ? [resolved] : []
  })

  const headerCta = navigation.header.cta
    ? {
        label: localizedNavigationValue(navigation.header.cta.label, locale),
        href: localizedNavigationValue(navigation.header.cta.href, locale),
      }
    : undefined

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="ship-header" data-site-header data-product-surface-mode={surfaceMode}>
        <div className="ship-header-inner">
          <Brand locale={locale} />
          <nav className="ship-main-nav" aria-label={copy.primaryNavigation}>
            {nav.map(({ id, label, href }) => (
              <a href={href} key={id}>
                {label}
              </a>
            ))}
          </nav>
          <div className="ship-header-actions">
            <nav className="ship-language-menu" aria-label={copy.languageSwitcher}>
              <Globe2 aria-hidden="true" />
              <span className="ship-language-current">{localeConfig[locale].label}</span>
              {localeAlternates.length > 0 && <ChevronDown aria-hidden="true" />}
              {localeAlternates.map((alternate) => (
                <a
                  aria-label={
                    locale === 'zh-CN' ? `切换到${alternate.label}` : `Switch to ${alternate.label}`
                  }
                  className="locale-switch"
                  data-locale-switch
                  href={alternate.path}
                  hrefLang={alternate.locale}
                  key={alternate.locale}
                  lang={alternate.locale}
                >
                  {alternate.shortLabel}
                </a>
              ))}
            </nav>
            {headerCta?.label && headerCta.href ? (
              <Button asChild size="sm" data-header-cta>
                <a href={headerCta.href}>{headerCta.label}</a>
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      {productConfig.starter.showPreviewBanner ? (
        <div className="preview-banner" data-starter-preview-banner>
          <span className="preview-banner-dot" />
          <span>{copy.previewNotice}</span>
        </div>
      ) : null}

      <main>
        <Outlet />
      </main>

      <SiteFooter locale={locale} navigation={navigation} />
    </div>
  )
}

function resolveHeaderLink(
  linkId: HeaderLinkId,
  locale: Locale,
  navigation: SiteNavigationConfig,
): { id: HeaderLinkId; label: string; href: string } | undefined {
  const copy = shellMessages[locale]
  const homePath = localizedPathOrDefault('home', locale)

  switch (linkId) {
    case 'home':
      return { id: linkId, label: copy.nav.home, href: homePath }
    case 'workflow':
      return { id: linkId, label: copy.nav.workflow, href: `${homePath}#workflow` }
    case 'guides':
      return {
        id: linkId,
        label: copy.nav.guides,
        href: localizedPathOrDefault('guides', locale),
      }
    case 'pricing':
      return {
        id: linkId,
        label: copy.nav.pricing,
        href: localizedPathOrDefault('pricing', locale),
      }
    case 'tools': {
      const href = navigation.header.toolsHref
        ? localizedNavigationValue(navigation.header.toolsHref, locale)
        : undefined
      return href ? { id: linkId, label: copy.nav.tools, href } : undefined
    }
  }
}

function Brand({ locale }: Readonly<{ locale: Locale }>) {
  const copy = shellMessages[locale]
  return (
    <a
      className="ship-brand"
      href={localizedPathOrDefault('home', locale)}
      aria-label={`${site.name} ${copy.nav.home}`}
    >
      <span className="ship-brand-mark">
        {productConfig.brand.mark}
        <i />
      </span>
      <span>{site.name}</span>
    </a>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const locale = localeFromPathname(pathname)
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: site.name,
    url: site.url,
    description: site.description,
    inLanguage: localeConfig[locale].htmlLang,
  }
  return (
    <html lang={localeConfig[locale].htmlLang}>
      <head>
        <HeadContent />
      </head>
      <body>
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
        {children}
        <Scripts />
      </body>
    </html>
  )
}

function NotFound() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const locale = localeFromPathname(pathname)
  const copy = shellMessages[locale].notFound
  return (
    <section className="grid min-h-[70vh] place-items-center px-5 text-center">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          {copy.kicker}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">{copy.title}</h1>
        <Button asChild className="mt-7">
          <a href={localizedPathOrDefault('home', locale)}>{copy.returnHome}</a>
        </Button>
      </div>
    </section>
  )
}
