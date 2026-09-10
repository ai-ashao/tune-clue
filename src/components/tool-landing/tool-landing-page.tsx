import type { ReactNode } from 'react'
import { defaultLocale } from '@/i18n/config'
import { resolveRelatedTools, type ToolRegistryItem } from '@/lib/tool-registry'
import { ToolCompletionSummary } from './completion-summary'
import { ToolConstraintsSummary } from './constraints'
import { HelpfulGuidance } from './helpful-guidance'
import type { ToolCapability, ToolLandingConfig, ToolSectionItem } from './types'
import { ToolValueSignals } from './value-signals'

export function ToolLandingPage({
  config,
  tool,
  registry = [],
}: Readonly<{
  config: ToolLandingConfig
  tool: ReactNode
  registry?: ReadonlyArray<ToolRegistryItem>
}>) {
  const breadcrumbs = config.breadcrumbs ?? []
  const related =
    config.relatedTools && registry.length > 0
      ? resolveRelatedTools({
          registry,
          currentToolId: config.toolId,
          requestedIds: config.relatedTools.toolIds,
          locale: config.locale ?? defaultLocale,
        })
      : []

  const capabilitySection =
    config.capabilities ??
    (config.features
      ? {
          title: config.features.title,
          items: config.features.items.map((item, index) => ({
            id: `legacy-feature-${index + 1}`,
            title: item.title,
            description: item.description,
          })),
        }
      : undefined)

  return (
    <article
      className="pb-16 sm:pb-20"
      data-tool-id={config.toolId}
      data-tool-landing-version={config.version}
    >
      <section
        className="mx-auto w-full max-w-5xl px-4 pb-7 pt-5 sm:px-6 sm:pt-7"
        data-tool-first-viewport
      >
        {breadcrumbs.length > 1 ? (
          <nav
            aria-label={config.a11y?.breadcrumbLabel ?? 'Breadcrumb'}
            className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
          >
            {breadcrumbs.map((item, index) => {
              const isCurrent = index === breadcrumbs.length - 1
              return (
                <span className="inline-flex items-center gap-2" key={item.href}>
                  {index > 0 ? <span aria-hidden="true">/</span> : null}
                  {isCurrent ? (
                    <span aria-current="page">{item.label}</span>
                  ) : (
                    <a className="hover:text-foreground" href={item.href}>
                      {item.label}
                    </a>
                  )}
                </span>
              )
            })}
          </nav>
        ) : null}

        <div className="mx-auto max-w-3xl text-center">
          {config.hero.eyebrow ? (
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {config.hero.eyebrow}
            </p>
          ) : null}

          <h1
            className="mt-2 text-balance text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl"
            data-tool-title
          >
            {config.hero.title}
          </h1>

          <p
            className="mx-auto mt-3 max-w-2xl text-pretty text-sm leading-6 text-muted-foreground sm:text-base"
            data-tool-description
          >
            {config.hero.description}
          </p>
        </div>

        <div className="mt-4 scroll-mt-20" data-tool-primary-region>
          {tool}
        </div>

        <ToolConstraintsSummary
          ariaLabel={config.a11y?.constraintsLabel}
          constraints={config.constraints}
        />

        <ToolValueSignals
          ariaLabel={config.a11y?.valueSignalsLabel}
          experience={config.experience}
          labels={config.valueLabels}
        />

        {config.completionPlacement !== 'after-capabilities' ? (
          <ToolCompletionSummary
            ariaLabel={config.a11y?.completionLabel}
            completion={config.completion}
          />
        ) : null}
      </section>

      {related.length > 0 && config.relatedTools ? (
        <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6" data-related-tools>
          <h2 className="text-xl font-semibold tracking-tight">{config.relatedTools.title}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <a
                className="rounded-xl border bg-card p-4 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                href={item.href}
                key={item.id}
              >
                <h3 className="font-medium">{item.label}</h3>
                {item.description ? (
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">{item.description}</p>
                ) : null}
              </a>
            ))}
          </div>
        </section>
      ) : null}

      <ItemSection section={config.benefits} />
      <ItemSection
        kind="how-it-works"
        section={config.howItWorks}
        itemsKey="steps"
        numbered
        sectionId="workflow"
      />
      <CapabilitySection section={capabilitySection} />
      {config.completionPlacement === 'after-capabilities' && config.completion ? (
        <section
          className="mx-auto w-full max-w-5xl px-4 py-9 sm:px-6"
          data-tool-completion-section
        >
          {config.completion.title ? (
            <h2 className="text-2xl font-semibold tracking-tight">{config.completion.title}</h2>
          ) : null}
          {config.completion.description ? (
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {config.completion.description}
            </p>
          ) : null}
          <ToolCompletionSummary
            ariaLabel={config.a11y?.completionLabel}
            completion={config.completion}
          />
        </section>
      ) : null}
      <ItemSection section={config.useCases} />
      <HelpfulGuidance blocks={config.helpfulGuidance} />

      {config.faq?.items.length ? (
        <section
          className="mx-auto w-full max-w-3xl scroll-mt-20 px-4 py-10 sm:px-6"
          data-tool-faq
          id={config.toolId === 'video-song-finder' ? 'faq' : undefined}
        >
          <h2 className="text-2xl font-semibold tracking-tight">{config.faq.title}</h2>
          {config.faq.description ? (
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{config.faq.description}</p>
          ) : null}
          <div className="mt-5 divide-y rounded-xl border">
            {config.faq.items.map((item) => (
              <details className="group px-4 py-4 sm:px-5" key={item.question}>
                <summary className="cursor-pointer list-none pr-8 font-medium">
                  {item.question}
                </summary>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      ) : null}

      {config.seoContent?.map((block) => (
        <section className="mx-auto w-full max-w-3xl px-4 py-7 sm:px-6" key={block.heading}>
          <h2 className="text-2xl font-semibold tracking-tight">{block.heading}</h2>
          <div className="mt-4 space-y-4 text-sm leading-7 text-muted-foreground sm:text-base">
            {block.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </section>
      ))}

      {config.bottomAction ? (
        <section className="mx-auto w-full max-w-5xl px-4 pt-8 sm:px-6" data-tool-bottom-action>
          <div className="rounded-2xl border bg-muted/30 px-5 py-7 text-center sm:px-8">
            <h2 className="text-2xl font-semibold tracking-tight">{config.bottomAction.title}</h2>
            {config.bottomAction.description ? (
              <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                {config.bottomAction.description}
              </p>
            ) : null}
            <a
              className="mt-5 inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              href={config.bottomAction.href}
            >
              {config.bottomAction.actionLabel}
            </a>
          </div>
        </section>
      ) : null}
    </article>
  )
}

function CapabilitySection({
  section,
}: Readonly<{
  section?: {
    title: string
    description?: string
    items: ReadonlyArray<ToolCapability>
  }
}>) {
  if (!section?.items.length) return null

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-9 sm:px-6" data-tool-capabilities>
      <h2 className="text-2xl font-semibold tracking-tight">{section.title}</h2>
      {section.description ? (
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{section.description}</p>
      ) : null}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {section.items.map((item) => (
          <article
            className="rounded-xl border bg-card p-4"
            data-capability-id={item.id}
            key={item.id}
          >
            <span aria-hidden="true" className="tc-capability-icon">
              {capabilityIcon(item.id)}
            </span>
            <h3 className="font-medium">{item.title}</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function capabilityIcon(id: string) {
  if (id === 'position') return '⌁'
  if (id === 'metadata') return '≡'
  return '◎'
}

function ItemSection({
  section,
  itemsKey = 'items',
  numbered = false,
  sectionId,
  kind,
}: Readonly<{
  section?:
    | { title: string; description?: string; items: ReadonlyArray<ToolSectionItem> }
    | { title: string; description?: string; steps: ReadonlyArray<ToolSectionItem> }
  itemsKey?: 'items' | 'steps'
  numbered?: boolean
  sectionId?: string
  kind?: string
}>) {
  if (!section) return null

  const items =
    itemsKey === 'steps' && 'steps' in section
      ? section.steps
      : 'items' in section
        ? section.items
        : []

  if (items.length === 0) return null

  return (
    <section
      className="mx-auto w-full max-w-5xl scroll-mt-20 px-4 py-9 sm:px-6"
      data-section-kind={kind}
      id={sectionId}
    >
      <h2 className="text-2xl font-semibold tracking-tight">{section.title}</h2>
      {section.description ? (
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{section.description}</p>
      ) : null}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, index) => (
          <div className="rounded-xl border bg-card p-4" key={item.title}>
            {numbered ? (
              <p className="tc-step-number font-mono text-xs font-semibold text-muted-foreground">
                {String(index + 1).padStart(2, '0')}
              </p>
            ) : null}
            <h3 className={numbered ? 'mt-2 font-medium' : 'font-medium'}>{item.title}</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
