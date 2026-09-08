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
      'Find a song from a local video or audio clip. Select the clearest music point and TuneClue identifies the track, artist, and listening links.',
    path: '/',
    indexable: true,
    applicationCategory: 'UtilitiesApplication',
  },
  hero: {
    eyebrow: 'Video Song Finder',
    title: 'Find the Song From a Video',
    description:
      'Upload a local clip and pick the moment where the music is clearest. TuneClue prepares a short audio sample in your browser and identifies the song.',
  },
  experience: {
    free: true,
    online: true,
    installationRequired: false,
    signupRequired: false,
    processing: 'hybrid',
  },
  constraints: {
    acceptedFormats: [
      'Browser-decodable audio',
      'MP4/WebM when your browser can decode the audio track',
    ],
    maxFileSize: '100 MB',
    maxFiles: 1,
    other: ['About 10 seconds of audio is sampled for each recognition attempt.'],
  },
  completion: {
    highlights: [
      'Choose the exact moment where the song is clearest',
      'Send only a short audio sample instead of the full local file',
      'Get title, artist, album, artwork, and available listening links',
      'Retry another position when a clip has voice-over or noise',
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
        question: 'Why can a video fail to decode in my browser?',
        answer:
          'Video containers can use different audio codecs. V1 relies on browser decoding first, so support depends on the codec your browser exposes to the Web Audio decoder.',
      },
      {
        question: 'What happens if no song is found?',
        answer:
          'A no-match result is different from a system error. Try selecting another section where the background music is clearer.',
      },
    ],
  },
  structuredData: {
    enableFaq: true,
  },
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
