import { createFileRoute } from '@tanstack/react-router'
import { TikTokSongFinderPage, tiktokSongFinderConfig } from '@/components/tuneclue/tiktok-page'
import { pageHead } from '@/lib/seo'

export const Route = createFileRoute('/tiktok-song-finder')({
  head: () =>
    pageHead({
      title: tiktokSongFinderConfig.seo.title,
      description: tiktokSongFinderConfig.seo.description,
      path: tiktokSongFinderConfig.seo.path,
      indexable: tiktokSongFinderConfig.seo.indexable,
      socialImage: tiktokSongFinderConfig.seo.socialImage,
    }),
  component: TikTokSongFinderPage,
})
