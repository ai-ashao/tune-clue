import type { ToolSeoBrief } from '@/lib/tool-seo-brief'

export const toolSeoBrief = {
  status: 'ready',
  primaryKeyword: 'song finder by video',
  searchIntent: 'tool',
  primaryPage: '/',
  supportingKeywords: [
    'find song from video',
    'video song finder',
    'song identifier from video',
    'music identifier from video',
    'song detector from video',
    'tiktok song finder',
    'find song from tiktok',
    'find song from tiktok link',
  ],
  firstBatchPages: [
    {
      keyword: 'song finder by video',
      path: '/',
      pageType: 'tool',
      locale: 'en',
    },
    {
      keyword: 'tiktok song finder',
      path: '/tiktok-song-finder',
      pageType: 'tool',
      locale: 'en',
    },
  ],
  locales: ['en'],
  evidence: [
    {
      source: 'manual SERP and competitor review, 2026-09-08',
      note: 'Generic video song-finder intent and a distinct TikTok tool intent are validated; TikTok is the strongest first platform wedge in the reviewed same-domain competitor data.',
    },
  ],
} satisfies ToolSeoBrief
