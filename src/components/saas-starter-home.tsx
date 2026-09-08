import { ArrowRight, Check, Layers3, Play, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Locale } from '@/i18n/config'
import { productHomeMessages } from '@/i18n/product-home-messages'
import { localizedPathOrDefault } from '@/i18n/routes'
import { sandboxUiAvailable } from '@/lib/config/runtime'
import { productSurfaceEnabled } from '@/lib/product-config'

const workflowSectionId = 'workflow'

export function SaasStarterHome({ locale }: Readonly<{ locale: Locale }>) {
  const copy = productHomeMessages[locale].saas
  const homePath = localizedPathOrDefault('home', locale)
  const appAvailable = sandboxUiAvailable && productSurfaceEnabled('app')
  const primaryHref = appAvailable ? '/login' : `${homePath}#workflow`

  return (
    <div data-product-mode-home="saas">
      <section className="mx-auto grid w-full max-w-[1180px] gap-10 px-4 pb-14 pt-10 sm:px-6 sm:pb-20 sm:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {copy.eyebrow}
          </p>
          <h1 className="mt-4 max-w-3xl text-balance text-4xl font-semibold tracking-[-0.045em] sm:text-6xl">
            {copy.title}
          </h1>
          <p className="mt-6 max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
            {copy.description}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <a href={primaryHref}>
                {copy.primary}
                <ArrowRight />
              </a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href={`${homePath}#workflow`}>{copy.secondary}</a>
            </Button>
          </div>

          <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            {copy.proof.map((item) => (
              <li className="inline-flex items-center gap-1.5" key={item}>
                <Check className="size-4" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <ProductPreview locale={locale} />
      </section>

      <section className="border-y bg-muted/20">
        <div className="mx-auto w-full max-w-[1180px] px-4 py-14 sm:px-6 sm:py-18">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {copy.benefitsEyebrow}
          </p>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
            {copy.benefitsTitle}
          </h2>
          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {copy.benefits.map(([title, description]) => (
              <article className="rounded-2xl border bg-card p-5" key={title}>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        className="mx-auto w-full max-w-[1180px] scroll-mt-24 px-4 py-16 sm:px-6 sm:py-24"
        id={workflowSectionId}
      >
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {copy.workflowEyebrow}
        </p>
        <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
          {copy.workflowTitle}
        </h2>
        <ol className="mt-8 grid gap-3 md:grid-cols-3">
          {copy.workflow.map(([title, description], index) => (
            <li className="rounded-2xl border bg-card p-5" key={title}>
              <span className="font-mono text-xs text-muted-foreground">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-6 font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
            </li>
          ))}
        </ol>
      </section>

      {productSurfaceEnabled('pricing') ? (
        <section className="mx-auto w-full max-w-[1180px] px-4 pb-16 sm:px-6 sm:pb-24">
          <div className="grid gap-6 rounded-2xl border bg-card p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {copy.pricingEyebrow}
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight">{copy.pricingTitle}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                {copy.pricingBody}
              </p>
            </div>
            <Button asChild variant="outline">
              <a href={localizedPathOrDefault('pricing', locale)}>{copy.pricingAction}</a>
            </Button>
          </div>
        </section>
      ) : null}

      <section className="mx-auto w-full max-w-3xl px-4 pb-16 sm:px-6 sm:pb-24">
        <h2 className="text-3xl font-semibold tracking-[-0.035em]">{copy.faqTitle}</h2>
        <div className="mt-6 divide-y rounded-2xl border">
          {copy.faqs.map(([question, answer]) => (
            <details className="px-5 py-4" key={question}>
              <summary className="cursor-pointer font-medium">{question}</summary>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1180px] px-4 pb-20 sm:px-6 sm:pb-28">
        <div className="rounded-2xl border bg-muted/30 px-6 py-10 text-center sm:px-10">
          <h2 className="mx-auto max-w-3xl text-balance text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            {copy.finalTitle}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
            {copy.finalBody}
          </p>
          <Button asChild className="mt-7" size="lg">
            <a href={primaryHref}>
              <Play />
              {copy.finalAction}
            </a>
          </Button>
        </div>
      </section>
    </div>
  )
}

function ProductPreview({ locale }: Readonly<{ locale: Locale }>) {
  const copy = productHomeMessages[locale].saas

  return (
    <aside
      className="overflow-hidden rounded-2xl border bg-card shadow-sm"
      aria-label={copy.previewTitle}
    >
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {copy.previewEyebrow}
          </p>
          <h2 className="mt-1 text-sm font-semibold">{copy.previewTitle}</h2>
        </div>
        <span className="grid size-9 place-items-center rounded-xl bg-muted">
          <Layers3 className="size-4" aria-hidden="true" />
        </span>
      </div>
      <div className="grid gap-3 p-5">
        {copy.previewItems.map(([title, description], index) => (
          <div
            className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border bg-background p-4"
            key={title}
          >
            <span className="grid size-8 place-items-center rounded-lg bg-muted font-mono text-[10px]">
              {String(index + 1).padStart(2, '0')}
            </span>
            <div>
              <h3 className="text-sm font-medium">{title}</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
            </div>
            <ShieldCheck className="size-4 text-muted-foreground" aria-hidden="true" />
          </div>
        ))}
      </div>
    </aside>
  )
}
