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
      'Paste a public TikTok video link to identify the song, artist, and available listening links. TuneClue keeps this page noindex until the TikTok extractor launch gate passes.',
    path: '/tiktok-song-finder',
    indexable: tuneClueFlags.tiktok,
    applicationCategory: 'UtilitiesApplication',
  },
  hero: {
    eyebrow: 'TikTok Song Finder',
    title: 'Find the Song in a TikTok',
    description:
      'Paste a public TikTok link. TuneClue identifies the track after the TikTok extractor launch gate is enabled.',
  },
  experience: {
    free: true,
    online: true,
    installationRequired: false,
    signupRequired: false,
    processing: 'server',
  },
  constraints: {
    other: [
      'Public TikTok videos only',
      'Private, deleted, login-gated, or region-restricted videos may be unavailable',
    ],
  },
  completion: {
    highlights: [
      'Paste a TikTok video link instead of using a microphone',
      'Identify a track even when the post context is unclear',
      'Get the song title and artist in one result',
      'Open available listening links after a successful match',
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
  structuredData: {
    enableFaq: true,
  },
}

export function TikTokSongFinderPage() {
  const structured = buildToolStructuredData(tiktokSongFinderConfig, site)
  return (
    <div data-tiktok-live={tuneClueFlags.tiktok ? 'true' : 'false'}>
      <ToolStructuredData items={structured} />
      <ToolLandingPage
        config={tiktokSongFinderConfig}
        registry={toolRegistry}
        tool={<TikTokUrlForm />}
      />
    </div>
  )
}
