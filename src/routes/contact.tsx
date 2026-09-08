import { createFileRoute } from '@tanstack/react-router'
import { InformationPage } from '@/components/information-page'
import { localizedPageHead } from '@/lib/seo'
import { site } from '@/lib/site'

export const Route = createFileRoute('/contact')({
  head: () =>
    localizedPageHead({
      pageId: 'contact',
      locale: 'en',
      title: 'Contact',
      description: `Find the support details for ${site.name}.`,
    }),
  component: ContactPage,
})

function ContactPage() {
  return (
    <InformationPage
      eyebrow="Contact"
      title="Make support easy to find."
      description="This is the neutral starter contact page. Replace the guidance below with a real support channel before launch."
    >
      <p>
        Add the support email, contact form, or community link that users should use for help. Keep
        the first response path clear and owned by a real person or team.
      </p>
      <p>
        Align this page with the contact address used by the reviewed Privacy Policy and Terms of
        Service before production release.
      </p>
    </InformationPage>
  )
}
