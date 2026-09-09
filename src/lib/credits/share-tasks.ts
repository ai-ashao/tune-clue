export const sharePlatforms = ['whatsapp', 'telegram', 'x'] as const
export type SharePlatform = (typeof sharePlatforms)[number]

export const shareTaskMeta: Record<SharePlatform, { label: string; reward: number }> = {
  whatsapp: { label: 'WhatsApp', reward: 1 },
  telegram: { label: 'Telegram', reward: 1 },
  x: { label: 'X', reward: 1 },
}

export function isSharePlatform(value: unknown): value is SharePlatform {
  return typeof value === 'string' && sharePlatforms.includes(value as SharePlatform)
}

export function buildShareUrl(platform: SharePlatform, origin: string) {
  const sharedUrl = new URL('/', origin)
  sharedUrl.searchParams.set('utm_source', platform)
  sharedUrl.searchParams.set('utm_medium', 'share_reward')
  sharedUrl.searchParams.set('utm_campaign', 'earn_credits')

  const text = 'I found music from a video with TuneClue. Try it:'
  const target = sharedUrl.toString()

  if (platform === 'whatsapp') {
    const url = new URL('https://wa.me/')
    url.searchParams.set('text', `${text} ${target}`)
    return url.toString()
  }

  if (platform === 'telegram') {
    const url = new URL('https://t.me/share/url')
    url.searchParams.set('url', target)
    url.searchParams.set('text', text)
    return url.toString()
  }

  const url = new URL('https://twitter.com/intent/tweet')
  url.searchParams.set('url', target)
  url.searchParams.set('text', text)
  return url.toString()
}
