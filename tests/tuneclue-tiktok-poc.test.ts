import { describe, expect, it } from 'vitest'
import {
  canonicalFromOEmbed,
  extractJsonScript,
  parseTikTokPage,
  videoIdFromOEmbed,
} from '@/lib/tiktok/page-parser'
import {
  assertTikTokRedirectUrl,
  extractTikTokPostId,
  normalizeTikTokInputUrl,
  trustedTikTokMediaUrl,
} from '@/lib/tiktok/url-policy'

const VIDEO_ID = '7350000000000000001'
const AUDIO_URL =
  'https://p16-va.tiktokcdn.com/obj/tos-maliva-v-27/known-audio?x-expires=9999999999'
const VIDEO_URL =
  'https://v16-webapp-prime.us.tiktok.com/video/tos/useast2a/known-video?x-expires=9999999999'

describe('TikTok URL policy', () => {
  it('accepts canonical and short TikTok HTTPS URLs only', () => {
    expect(
      normalizeTikTokInputUrl(`https://www.tiktok.com/@creator/video/${VIDEO_ID}`).hostname,
    ).toBe('www.tiktok.com')
    expect(normalizeTikTokInputUrl('https://vm.tiktok.com/ZExample/').hostname).toBe(
      'vm.tiktok.com',
    )
    expect(() => normalizeTikTokInputUrl('http://www.tiktok.com/video/123')).toThrow()
    expect(() => normalizeTikTokInputUrl('https://example.com/video/123')).toThrow()
    expect(() => normalizeTikTokInputUrl('https://www.tiktok.com.evil.test/video/123')).toThrow()
  })

  it('does not allow redirect escape to a non-TikTok host', () => {
    expect(
      assertTikTokRedirectUrl(`/@creator/video/${VIDEO_ID}`, 'https://vm.tiktok.com/ZExample/')
        .hostname,
    ).toBe('vm.tiktok.com')
    expect(() =>
      assertTikTokRedirectUrl('https://attacker.example/media', 'https://vm.tiktok.com/ZExample/'),
    ).toThrow()
  })

  it('accepts known TikTok CDN media hosts and rejects local/arbitrary hosts', () => {
    expect(trustedTikTokMediaUrl(AUDIO_URL)?.hostname).toBe('p16-va.tiktokcdn.com')
    expect(trustedTikTokMediaUrl(VIDEO_URL)?.hostname).toBe('v16-webapp-prime.us.tiktok.com')
    expect(trustedTikTokMediaUrl('https://127.0.0.1/audio.mp3')).toBeUndefined()
    expect(trustedTikTokMediaUrl('https://example.com/audio.mp3')).toBeUndefined()
  })

  it('extracts a post id from a canonical path', () => {
    expect(extractTikTokPostId(`https://www.tiktok.com/@creator/video/${VIDEO_ID}`)).toBe(VIDEO_ID)
  })
})

describe('TikTok structured page parser', () => {
  it('parses modern universal hydration data and extracts direct music/video candidates', () => {
    const hydration = {
      __DEFAULT_SCOPE__: {
        'webapp.video-detail': {
          statusCode: 0,
          itemInfo: {
            itemStruct: {
              id: VIDEO_ID,
              desc: 'Known public post',
              author: {
                uniqueId: 'creator',
                nickname: 'Creator',
              },
              music: {
                title: 'Known Song',
                authorName: 'Known Artist',
                playUrl: AUDIO_URL,
              },
              video: {
                duration: 17,
                playAddr: VIDEO_URL,
              },
            },
          },
        },
      },
    }

    const html = `<html><script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">${JSON.stringify(
      hydration,
    )}</script></html>`

    const result = parseTikTokPage({
      inputUrl: `https://www.tiktok.com/@creator/video/${VIDEO_ID}`,
      finalUrl: `https://www.tiktok.com/@creator/video/${VIDEO_ID}`,
      html,
    })

    expect(result.source).toBe('universal-data')
    expect(result.videoId).toBe(VIDEO_ID)
    expect(result.musicTitle).toBe('Known Song')
    expect(result.audio?.host).toBe('p16-va.tiktokcdn.com')
    expect(result.video?.host).toBe('v16-webapp-prime.us.tiktok.com')
    expect(result.internalAudioUrl).toBe(AUDIO_URL)
    expect(result.internalVideoUrl).toBe(VIDEO_URL)
  })

  it('falls back to legacy SIGI_STATE', () => {
    const sigi = {
      ItemModule: {
        [VIDEO_ID]: {
          id: VIDEO_ID,
          desc: 'Legacy post',
          author: { uniqueId: 'legacycreator' },
          music: { title: 'Legacy Song', playUrl: AUDIO_URL },
          video: { duration: 10, playAddr: VIDEO_URL },
        },
      },
    }

    const html = `<script id="SIGI_STATE" type="application/json">${JSON.stringify(sigi)}</script>`

    const result = parseTikTokPage({
      inputUrl: `https://www.tiktok.com/@legacycreator/video/${VIDEO_ID}`,
      finalUrl: `https://www.tiktok.com/@legacycreator/video/${VIDEO_ID}`,
      html,
    })

    expect(result.source).toBe('sigi-state')
    expect(result.title).toBe('Legacy post')
    expect(result.musicTitle).toBe('Legacy Song')
  })

  it('uses official oEmbed as a canonical/id metadata fallback', () => {
    const oEmbed = {
      title: 'Embedded post',
      author_name: 'Scout',
      html: `<blockquote cite="https://www.tiktok.com/@scout/video/${VIDEO_ID}" data-video-id="${VIDEO_ID}"></blockquote>`,
    }

    expect(videoIdFromOEmbed(oEmbed)).toBe(VIDEO_ID)
    expect(canonicalFromOEmbed(oEmbed)).toBe(`https://www.tiktok.com/@scout/video/${VIDEO_ID}`)

    const result = parseTikTokPage({
      inputUrl: `https://www.tiktok.com/@scout/video/${VIDEO_ID}`,
      finalUrl: `https://www.tiktok.com/@scout/video/${VIDEO_ID}`,
      html: '<html></html>',
      oEmbed,
    })

    expect(result.source).toBe('oembed-only')
    expect(result.title).toBe('Embedded post')
    expect(result.author).toBe('Scout')
    expect(result.audio).toBeUndefined()
  })

  it('extracts JSON script blocks without executing page JavaScript', () => {
    expect(
      extractJsonScript(
        '<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">{"ok":true}</script>',
        '__UNIVERSAL_DATA_FOR_REHYDRATION__',
      ),
    ).toEqual({ ok: true })
  })
})
