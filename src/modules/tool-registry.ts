import type { ToolRegistryItem } from '@/lib/tool-registry'
import { tuneClueFlags } from '@/lib/tuneclue-flags'

export const toolRegistry = [
  {
    id: 'video-song-finder',
    label: 'Video Song Finder',
    href: '/',
    description: 'Identify a song from a local audio or video clip.',
    tags: ['song-finder', 'music-recognition', 'video'],
    status: 'live',
    indexable: true,
  },
  {
    id: 'tiktok-song-finder',
    label: 'TikTok Song Finder',
    href: '/tiktok-song-finder',
    description: 'Identify a song from a public TikTok link.',
    tags: ['song-finder', 'music-recognition', 'video', 'tiktok'],
    status: tuneClueFlags.tiktok ? 'live' : 'planned',
    indexable: tuneClueFlags.tiktok,
  },
] satisfies ReadonlyArray<ToolRegistryItem>
