import { createFileRoute, Link } from '@tanstack/react-router'
import { guides } from '@/lib/guides'
import { localizedPageHead } from '@/lib/seo'

export const Route = createFileRoute('/guides/')({
  head: () =>
    localizedPageHead({
      pageId: 'guides',
      locale: 'en',
      title: 'Build Guides',
      description:
        'Short, practical notes on using the ShipLean Skill, replacing the local auth boundary, and shipping a Cloudflare-first TanStack Start MVP.',
    }),
  component: GuidesPage,
})

function GuidesPage() {
  return (
    <section className="mx-auto max-w-[1180px] px-4 py-10 sm:px-6 sm:py-16">
      <header className="max-w-3xl">
        <p className="section-kicker">Field notes / No filler</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
          Build notes from the launch floor.
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
          Compact explanations for the decisions that make a small product cheaper to own.
        </p>
      </header>
      <div className="mt-10 overflow-hidden rounded-xl border bg-white">
        {guides.map((guide) => (
          <Link
            className="grid gap-4 border-b px-5 py-6 last:border-0 hover:bg-[#fafcf8] sm:grid-cols-[52px_1fr_auto] sm:items-center"
            key={guide.slug}
            to="/guides/$slug"
            params={{ slug: guide.slug }}
          >
            <span className="font-mono text-[10px] text-[#679a32]">{guide.number}</span>
            <div>
              <h2 className="text-base font-semibold">{guide.title}</h2>
              <p className="mb-0 mt-2 text-xs leading-5 text-muted-foreground">{guide.summary}</p>
            </div>
            <span className="text-[11px] text-muted-foreground">{guide.time} ↗</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
