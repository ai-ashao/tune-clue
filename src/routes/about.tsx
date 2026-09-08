import { createFileRoute } from '@tanstack/react-router'
import { InformationPage } from '@/components/information-page'
import { localizedPageHead } from '@/lib/seo'

export const Route = createFileRoute('/about')({
  head: () =>
    localizedPageHead({
      pageId: 'about',
      locale: 'en',
      title: 'About TuneClue',
      description: 'Learn how TuneClue helps identify songs from local video and audio clips.',
    }),
  component: AboutPage,
})

function AboutPage() {
  return (
    <InformationPage
      eyebrow="About"
      title="A focused song finder for video clips."
      description="TuneClue helps identify the music playing in a local video or audio clip without turning the site into a downloader or media library."
    >
      <p>
        Choose a local clip, select the point where the music is clearest, and TuneClue prepares a
        short audio sample for music recognition. The original local file is not uploaded in full.
      </p>
      <p>
        TuneClue does not provide song downloads, TikTok video downloads, or a public media mirror.
        Social-video link support is only published after the corresponding extraction flow is
        verified in production.
      </p>
      <p>
        For support or privacy questions, contact{' '}
        <a className="underline underline-offset-4" href="mailto:support@tuneclue.com">
          support@tuneclue.com
        </a>
        .
      </p>
    </InformationPage>
  )
}
