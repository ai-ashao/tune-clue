import { createFileRoute } from '@tanstack/react-router'
import { InformationPage } from '@/components/information-page'
import { localizedPageHead } from '@/lib/seo'
import { site } from '@/lib/site'

export const Route = createFileRoute('/about')({
  head: () =>
    localizedPageHead({
      pageId: 'about',
      locale: 'en',
      title: 'About Us',
      description: `Learn what ${site.name} is built to help its users accomplish.`,
    }),
  component: AboutPage,
})

function AboutPage() {
  return (
    <InformationPage
      eyebrow="About"
      title={`Tell users why ${site.name} should exist.`}
      description="This is neutral starter copy. Replace it with the real product story, operator details, and support commitments before launch."
    >
      <p>
        Explain the user problem, the product point of view, and the outcome your product is
        designed to deliver. Keep the story specific enough that a visitor can understand why this
        product is different.
      </p>
      <p>
        Before launch, replace every starter statement on this page with facts about the real
        product and the real operator.
      </p>
    </InformationPage>
  )
}
