import { describe, expect, it } from 'vitest'
import { normalizeAudDResponse } from '@/lib/recognition/normalize-audd'

describe('normalizeAudDResponse', () => {
  it('maps result:null to no-match', () => {
    expect(normalizeAudDResponse({ status: 'success', result: null })).toEqual({
      status: 'no-match',
    })
  })

  it('normalizes a matched song', () => {
    expect(
      normalizeAudDResponse({
        status: 'success',
        result: {
          title: 'Song',
          artist: 'Artist',
          album: 'Album',
          song_link: 'https://lis.tn/example',
          spotify: { external_urls: { spotify: 'https://open.spotify.com/track/example' } },
        },
      }),
    ).toMatchObject({
      status: 'matched',
      title: 'Song',
      artist: 'Artist',
      links: {
        spotify: 'https://open.spotify.com/track/example',
        songLink: 'https://lis.tn/example',
      },
    })
  })

  it('rejects provider error payloads', () => {
    expect(() =>
      normalizeAudDResponse({
        status: 'error',
        error: { error_message: 'bad token' },
      }),
    ).toThrow('bad token')
  })

  it('drops unsafe artwork and non-HTTPS listening URLs', () => {
    expect(
      normalizeAudDResponse({
        status: 'success',
        result: {
          title: 'Song',
          artist: 'Artist',
          song_link: 'javascript:alert(1)',
          apple_music: {
            url: 'http://music.apple.com/example',
            artwork: { url: 'https://attacker.example/cover.jpg' },
          },
        },
      }),
    ).toMatchObject({
      status: 'matched',
      artworkUrl: undefined,
      links: {
        appleMusic: undefined,
        songLink: undefined,
      },
    })
  })
})
