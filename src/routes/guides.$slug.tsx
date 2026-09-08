import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { guidePageId } from '@/i18n/routes'
import { type GuideSlug, guideBodies, guides } from '@/lib/guides'
import { localizedPageHead, pageHead } from '@/lib/seo'

export const Route = createFileRoute('/guides/$slug')({
  loader: ({ params }) => {
    const guide = guides.find((item) => item.slug === params.slug)
    if (!guide) throw notFound()
    return { guide, body: guideBodies[guide.slug as GuideSlug] }
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return pageHead({
        title: 'Guide',
        description: 'ShipLean build guide.',
        path: '/guides',
      })
    }
    return localizedPageHead({
      pageId: guidePageId(loaderData.guide.slug),
      locale: 'en',
      title: loaderData.guide.title,
      description: loaderData.guide.summary,
    })
  },
  component: GuidePage,
})

function GuidePage() {
  const { guide, body } = Route.useLoaderData()
  return (
    <article className="guide-article section-pad">
      <Link className="back-link" to="/guides">
        ← All field notes
      </Link>
      <header>
        <p className="eyebrow">
          <span>{guide.number}</span> {guide.time.toUpperCase()} READ
        </p>
        <h1>{guide.title}</h1>
        <p>{guide.summary}</p>
      </header>
      <div className="article-body">
        {body.map((section, index) => (
          <section key={section.heading}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <div>
              <h2>{section.heading}</h2>
              <p>{section.body}</p>
            </div>
          </section>
        ))}
      </div>
    </article>
  )
}
