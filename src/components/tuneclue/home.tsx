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
      'Free online song finder by video. Upload a local clip, choose the clearest music point, and identify the track and artist. No installation required.',
    path: '/',
    indexable: true,
    applicationCategory: 'UtilitiesApplication',
  },
  hero: {
    eyebrow: 'Video Song Finder',
    title: 'Find the Song From a Video',
    description:
      'Free online song finder for local video and audio clips. Upload a clip, pick the clearest music moment, and TuneClue prepares a short sample in your browser. Sign in with Google when you are ready to run your free song search.',
  },
  experience: {
    free: true,
    online: true,
    installationRequired: false,
    signupRequired: true,
    processing: 'hybrid',
  },
  constraints: {
    acceptedFormats: [
      'Browser-decodable audio',
      'MP4/WebM when your browser can decode the audio track',
    ],
    maxFileSize: '40 MB',
    maxFiles: 1,
    other: ['About 10 seconds of audio is sampled for each recognition attempt.'],
  },
  completion: {
    highlights: [
      'Choose the exact moment where the song is clearest',
      'Send only a short audio sample instead of the full local file',
      'Get title, artist, album, artwork, and available listening links',
      'Earn optional free searches through one-time sharing rewards',
    ],
  },
  capabilities: {
    title: 'What TuneClue does',
    items: [
      {
        id: 'local-sample',
        title: 'Local sample preparation',
        description:
          'TuneClue decodes a short section in your browser and sends the recognition sample, not the full original local file.',
      },
      {
        id: 'position',
        title: 'Choose the music position',
        description:
          'Skip intros, talking, and silence by selecting where the clearest part of the song starts.',
      },
      {
        id: 'metadata',
        title: 'Useful track details',
        description:
          'A successful match can include title, artist, album, artwork, and links to supported music services.',
      },
    ],
  },
  helpfulGuidance: [
    {
      heading: 'For the best song match',
      items: [
        {
          title: 'Pick a clean music section',
          description:
            'Choose a point with several seconds of audible music and less talking, sound effects, or silence.',
        },
        {
          title: 'Try another point after no match',
          description:
            'Short-form videos often change audio levels. Moving the sample window can produce a cleaner fingerprint.',
        },
      ],
    },
  ],
  faq: {
    title: 'Video song finder FAQ',
    items: [
      {
        question: 'Does TuneClue upload my whole video?',
        answer:
          'For the local-file flow, TuneClue prepares a short audio sample in your browser and sends that sample for song identification. The original local file is not uploaded in full.',
      },
      {
        question: 'Do I need an account?',
        answer:
          'You can upload and preview a local clip before signing in. Google sign-in is required when you run a song recognition so free and paid usage can be attached to a recoverable account.',
      },
      {
        question: 'What happens if no song is found?',
        answer:
          'A no-match result is different from a system error. Try selecting another section where the background music is clearer.',
      },
    ],
  },
  structuredData: { enableFaq: true },
}

export function TuneClueHome() {
  const structured = buildToolStructuredData(tuneClueHomeConfig, site)
  return (
    <div data-product-mode-home="tool">
      <ToolStructuredData items={structured} />
      <ToolLandingPage
        config={tuneClueHomeConfig}
        registry={toolRegistry}
        tool={<TuneClueSourceTool />}
      />
    </div>
  )
}
