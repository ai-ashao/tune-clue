import { PrivacyControls } from '@/components/privacy-controls'
import type { Locale } from '@/i18n/config'
import { shellMessages } from '@/i18n/messages'
import { localizedPathOrDefault } from '@/i18n/routes'
import { site } from '@/lib/site'
import {
  localizedNavigationValue,
  resolveFooterToolGroups,
  type SiteNavigationConfig,
  siteNavigation,
} from '@/lib/site-navigation'
import { toolRegistry } from '@/modules/tool-registry'

export function SiteFooter({
  locale,
  navigation = siteNavigation,
}: Readonly<{
  locale: Locale
  navigation?: SiteNavigationConfig
}>) {
  const copy = shellMessages[locale]
  const toolGroups = resolveFooterToolGroups({
    config: navigation,
    registry: toolRegistry,
    locale,
  })

  const standardSecondaryLinks = [
    ...(navigation.guidesPlacement === 'footer'
      ? [
          {
            id: 'guides',
            label: copy.footer.guides,
            href: localizedPathOrDefault('guides', locale),
          },
        ]
      : []),
    ...navigation.footer.secondaryPages.map((pageId) => ({
      id: pageId,
      label: copy.footer[pageId],
      href: localizedPathOrDefault(pageId, locale),
    })),
  ]

  const customLinks = (navigation.footer.customLinks ?? []).flatMap((link) => {
    const label = localizedNavigationValue(link.label, locale)
    const href = localizedNavigationValue(link.href, locale)
    return label && href ? [{ id: link.id, label, href }] : []
  })

  return (
    <footer className="ship-footer" data-site-footer>
      <div className="mx-auto w-full max-w-[1180px] px-6 py-10 sm:py-12">
        {toolGroups.length > 0 ? (
          <div
            className="grid gap-x-10 gap-y-9 border-b border-white/10 pb-10 sm:grid-cols-2 lg:grid-cols-4"
            data-footer-tool-directory
          >
            {toolGroups.map((group) => (
              <section key={group.id}>
                <h2 className="text-sm font-semibold text-slate-100">{group.title}</h2>
                <ul className="mt-4 space-y-3 text-sm">
                  {group.tools.map((tool) => (
                    <li key={tool.id}>
                      <a
                        className="text-slate-400 transition-colors hover:text-white focus-visible:text-white"
                        href={tool.href}
                      >
                        {tool.label}
                      </a>
                    </li>
                  ))}
                </ul>

                {group.viewMore ? (
                  <a
                    className="mt-4 inline-flex text-sm font-semibold text-emerald-300 transition-colors hover:text-emerald-200"
                    href={group.viewMore.href}
                  >
                    {group.viewMore.label} →
                  </a>
                ) : null}
              </section>
            ))}
          </div>
        ) : null}

        <div
          className={`flex flex-col gap-5 text-sm sm:flex-row sm:items-center sm:justify-between ${
            toolGroups.length > 0 ? 'pt-8' : ''
          }`}
        >
          <p className="m-0 text-slate-400">
            © {new Date().getFullYear()} {site.name}. All rights reserved.
          </p>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3" data-footer-secondary-links>
            {[...standardSecondaryLinks, ...customLinks].map((link) => (
              <a
                className="text-slate-400 transition-colors hover:text-white focus-visible:text-white"
                href={link.href}
                key={link.id}
              >
                {link.label}
              </a>
            ))}
            <PrivacyControls locale={locale} />
          </div>
        </div>
      </div>
    </footer>
  )
}
