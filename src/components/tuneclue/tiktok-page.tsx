import {
  type ToolLandingConfig,
  ToolLandingPage,
  ToolStructuredData,
} from '@/components/tool-landing'
import { site } from '@/lib/site'
import { buildToolStructuredData } from '@/lib/tool-structured-data'
import { tuneClueFlags } from '@/lib/tuneclue-flags'
import { toolRegistry } from '@/modules/tool-registry'
import { TikTokUrlForm } from './tiktok-url-form'

export const tiktokSongFinderConfig: ToolLandingConfig = {
  version: '0.2',
  preset: 'tool-default',
  toolId: 'tiktok-song-finder',
  locale: 'en',
  seo: {
    primaryKeyword: 'tiktok song finder',
    title: 'TikTok Song Finder – Find a Song from a TikTok Link',
    description:
      'Free online TikTok song finder for public video links. Paste a TikTok URL to identify the track and artist. No installation required; Google sign-in is required when recognition runs.',
    path: '/tiktok-song-finder',
    indexable: tuneClueFlags.tiktok,
    applicationCategory: 'UtilitiesApplication',
  },
  hero: {
    eyebrow: 'TikTok Song Finder',
    title: 'Find Song From a',
    accentText: 'TikTok Video',
    description:
      'Free online TikTok song finder for public video links. Paste a TikTok URL and sign in with Google when you are ready to run recognition.',
  },
  experience: {
    free: true,
    online: true,
    installationRequired: false,
    signupRequired: true,
    processing: 'server',
  },
  constraints: {
    other: [
      'Public TikTok videos only',
      'Private, deleted, login-gated, or region-restricted videos may be unavailable',
    ],
  },
  completion: {
    title: 'Recognition tips',
    description: 'Small choices that can make a difficult TikTok easier to identify.',
    highlights: [
      'Use the public video URL instead of a profile or sound-page link',
      'Try another post when a TikTok sound is heavily edited',
      'Choose a clip where the music is louder than speech and effects',
    ],
  },
  completionPlacement: 'after-capabilities',
  howItWorks: {
    title: 'How it works',
    description: 'A focused link-to-result flow with no recording or installation required.',
    steps: [
      {
        title: 'Paste the TikTok link',
        description: 'Add the public URL for the TikTok video whose music you want to identify.',
      },
      {
        title: 'Sign in and identify',
        description: 'Continue with Google when asked, then use one recognition credit.',
      },
      {
        title: 'Get the track',
        description: 'See the title, artist, artwork, and available listening links after a match.',
      },
    ],
  },
  capabilities: {
    title: 'Built for the TikTok song-finding task',
    items: [
      {
        id: 'link-first',
        title: 'Link-first workflow',
        description:
          'Start from the TikTok URL you already have instead of recording speaker audio.',
      },
      {
        id: 'original-sound',
        title: 'Useful for “Original Sound” cases',
        description:
          'When TikTok labels a post generically, audio recognition can still try to match the underlying commercial track.',
      },
      {
        id: 'fail-clearly',
        title: 'Clear availability errors',
        description:
          'Private, deleted, restricted, or extractor failures are reported separately from a genuine no-match result.',
      },
    ],
  },
  helpfulGuidance: [
    {
      heading: 'TikTok-specific guidance',
      items: [
        {
          title: 'Use the public video URL',
          description:
            'Share or copy the TikTok video link. TuneClue does not accept arbitrary server-fetch URLs.',
        },
        {
          title: 'Original Sound is not always a song',
          description:
            'Creator speech, mashups, and heavily modified audio may not map to one commercial track.',
        },
      ],
    },
  ],
  faq: {
    title: 'TikTok song finder FAQ',
    items: [
      {
        question: 'Can TuneClue identify TikTok Original Sound?',
        answer:
          'TuneClue can try to recognize music in a public TikTok even when the label says Original Sound, but creator-only audio or heavily edited mixes may have no database match.',
      },
      {
        question: 'Does TuneClue download TikTok videos or MP3 files?',
        answer:
          'No. TuneClue is a song-identification tool. It does not provide TikTok video downloads or song-file downloads.',
      },
    ],
  },
  bottomAction: {
    title: 'Ready to identify that TikTok song?',
    description: 'Paste the public video link and let TuneClue listen for the track.',
    actionLabel: 'Find a song',
    href: '#tool',
  },
  structuredData: {
    enableFaq: true,
  },
}

export function TikTokSongFinderPage() {
  if (!tuneClueFlags.tiktok) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          TikTok Song Finder
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          TikTok link recognition is not available yet.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          TuneClue only publishes a social-link finder after its extraction flow is verified in the
          production runtime. You can use the local video and audio song finder now.
        </p>
        <a className="mt-6 inline-flex text-sm font-medium underline underline-offset-4" href="/">
          Use Video Song Finder
        </a>
      </main>
    )
  }

  const structured = buildToolStructuredData(tiktokSongFinderConfig, site)
  return (
    <div className="tuneclue-shell" data-tiktok-live="true">
      <ToolStructuredData items={structured} />
      <ToolLandingPage
        config={tiktokSongFinderConfig}
        registry={toolRegistry}
        tool={<TikTokUrlForm />}
      />
    </div>
  )
}
