import {
  type ToolLandingConfig,
  ToolLandingPage,
  ToolStructuredData,
} from '@/components/tool-landing'
import { site } from '@/lib/site'
import { buildToolStructuredData } from '@/lib/tool-structured-data'
import { toolRegistry } from '@/modules/tool-registry'
import { TuneClueSourceTool } from './source-tool'

export const tuneClueHomeConfig: ToolLandingConfig = {
  version: '0.2',
  preset: 'tool-default',
  toolId: 'video-song-finder',
  locale: 'en',
  seo: {
    primaryKeyword: 'song finder by video',
    title: 'Song Finder by Video – Identify Music from a Clip',
    description:
      'Free online song finder by video. Paste a public TikTok link or upload a local clip to identify the track and artist. No installation required.',
    path: '/',
    indexable: true,
    applicationCategory: 'UtilitiesApplication',
  },
  hero: {
    eyebrow: 'Video Song Finder',
    title: 'Find Song',
    accentText: 'From a Video',
    description:
      'Use this free online song finder: paste a public TikTok URL or upload a local video or audio clip, then identify the song in one focused workspace.',
  },
  experience: {
    free: true,
    online: true,
    installationRequired: false,
    signupRequired: true,
    processing: 'hybrid',
    privacyFriendly: true,
  },
  completionPlacement: 'after-capabilities',
  completion: {
    title: 'Recognition tips',
    description: 'Small choices that can make a difficult clip easier to identify.',
    highlights: [
      'Choose a section with clear music and less dialogue',
      'Move the fixed 10-second window when the first attempt misses',
      'Use another public clip when a TikTok sound is heavily edited',
    ],
  },
  capabilities: {
    title: 'What TuneClue does',
    description: 'A focused song finder for links, local video, and audio clips.',
    items: [
      {
        id: 'link-or-file',
        title: 'Link or local file',
        description:
          'Start with a public TikTok link, or keep a local video in your browser and send only a short audio sample.',
      },
      {
        id: 'position',
        title: 'Pick the cleanest moment',
        description:
          'Skip talking, intros, and silence by choosing where the clearest part of the song starts.',
      },
      {
        id: 'metadata',
        title: 'Useful track details',
        description:
          'A successful match can include title, artist, album, artwork, and links to supported music services.',
      },
    ],
  },
  howItWorks: {
    title: 'How it works',
    description: 'The entire task stays focused, so you always know what happens next.',
    steps: [
      {
        title: 'Add your video',
        description: 'Paste a public TikTok URL or choose a video or audio file from your device.',
      },
      {
        title: 'Sign in and identify',
        description:
          'Use one recognition credit. For local files, choose the clearest point before sending the short sample.',
      },
      {
        title: 'Get the track',
        description:
          'See the title, artist, album, artwork, and available listening links when a match is found.',
      },
    ],
  },
  faq: {
    title: 'FAQ',
    description: 'Short answers about the real upload, link, and recognition flow.',
    items: [
      {
        question: 'Does TuneClue upload my whole video?',
        answer:
          'No. For the local-file flow, TuneClue prepares a short audio sample in your browser and sends that sample for song identification. The original local file is not uploaded in full.',
      },
      {
        question: 'Do I need an account?',
        answer:
          'You can upload and preview a local clip before signing in. Google sign-in is required when you run recognition so free and paid usage can be attached to a recoverable account.',
      },
      {
        question: 'What happens if no song is found?',
        answer:
          'A no-match result is different from a system error. Try another section where the music is clearer.',
      },
      {
        question: 'Which video links are supported?',
        answer:
          'TuneClue currently supports public TikTok video links. Private, deleted, login-gated, or region-restricted posts may be unavailable.',
      },
      {
        question: 'Does TuneClue download TikTok videos?',
        answer:
          'No. TuneClue reads available audio only to identify the song. It does not provide TikTok video or MP3 downloads.',
      },
    ],
  },
  bottomAction: {
    title: 'Ready to identify that song?',
    description: 'Paste a public TikTok link or upload the clip you already have.',
    actionLabel: 'Find a song',
    href: '#tool',
  },
  structuredData: { enableFaq: true },
}

export function TuneClueHome() {
  const structured = buildToolStructuredData(tuneClueHomeConfig, site)
  return (
    <div className="tuneclue-shell" data-product-mode-home="tool">
      <ToolStructuredData items={structured} />
      <ToolLandingPage
        config={tuneClueHomeConfig}
        registry={toolRegistry}
        tool={<TuneClueSourceTool />}
      />
    </div>
  )
}
