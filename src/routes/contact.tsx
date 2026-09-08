import { createFileRoute } from '@tanstack/react-router'
import { InformationPage } from '@/components/information-page'
import { localizedPageHead } from '@/lib/seo'

export const Route = createFileRoute('/contact')({
  head: () =>
    localizedPageHead({
      pageId: 'contact',
      locale: 'en',
      title: 'Contact TuneClue',
      description: 'Contact TuneClue for product support, privacy questions, or issue reports.',
    }),
  component: ContactPage,
})

function ContactPage() {
  return (
    <InformationPage
      eyebrow="Contact"
      title="Contact TuneClue"
      description="Use the support address below for product problems, privacy requests, or incorrect recognition behavior."
    >
      <p>
        Email{' '}
        <a className="underline underline-offset-4" href="mailto:support@tuneclue.com">
          support@tuneclue.com
        </a>
        . Include the browser, file type, and the error message you saw when reporting a technical
        problem. Do not attach copyrighted media unless it is necessary and you have the right to
        share it.
      </p>
      <p>
        TuneClue does not operate a song-download service. Requests for downloadable music files or
        TikTok video downloads are outside the product scope.
      </p>
    </InformationPage>
  )
}
