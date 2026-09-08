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
})
