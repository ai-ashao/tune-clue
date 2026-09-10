import { AudDConfigurationError, recognizeWithAudD } from '@/lib/recognition/audd.server'
import {
  fetchTikTokAudioFile,
  fetchTikTokOEmbed,
  fetchTikTokPage,
  probeTikTokMedia,
  type TikTokPageFetch,
} from './fetch.server'
import { type ParsedTikTokPage, parseTikTokPage, type TikTokOEmbed } from './page-parser'
import type { TikTokMediaProbe, TikTokPocAction } from './types'
import { TikTokUrlPolicyError } from './url-policy'

export class TikTokResolveError extends Error {
  constructor(
    readonly code:
      | 'invalid-url'
      | 'post-unavailable'
      | 'structured-data-missing'
      | 'audio-url-missing'
      | 'provider-error',
    message: string,
  ) {
    super(message)
    this.name = 'TikTokResolveError'
  }
}

export async function runTikTokPoc(input: { url: string; action: TikTokPocAction }) {
  let page: TikTokPageFetch
  try {
    page = await fetchTikTokPage(input.url)
  } catch (error) {
    if (error instanceof TikTokUrlPolicyError) {
      throw new TikTokResolveError('invalid-url', error.message)
    }
    throw error
  }

  const oEmbed = (await fetchTikTokOEmbed(page.finalUrl)) as TikTokOEmbed | undefined

  let parsed: ParsedTikTokPage
  try {
    parsed = parseTikTokPage({
      inputUrl: input.url,
      finalUrl: page.finalUrl,
      html: page.html,
      oEmbed,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'TikTok post could not be parsed.'
    if (/unavailable|private|removed|not found/i.test(message)) {
      throw new TikTokResolveError('post-unavailable', message)
    }
    throw new TikTokResolveError('structured-data-missing', message)
  }

  const publicResolved = stripInternalUrls(parsed)

  if (input.action === 'resolve') {
    return {
      action: input.action,
      resolved: publicResolved,
      capability: capabilitySummary(parsed),
    }
  }

  let audioProbe: TikTokMediaProbe | undefined
  let videoProbe: TikTokMediaProbe | undefined

  if (parsed.internalAudioUrl) {
    audioProbe = await probeTikTokMedia({
      mediaUrl: parsed.internalAudioUrl,
      referer: parsed.canonicalUrl,
      cookieHeader: page.cookieHeader,
    }).catch(() => undefined)
  }

  if (input.action === 'probe' && parsed.internalVideoUrl) {
    videoProbe = await probeTikTokMedia({
      mediaUrl: parsed.internalVideoUrl,
      referer: parsed.canonicalUrl,
      cookieHeader: page.cookieHeader,
    }).catch(() => undefined)
  }

  if (input.action === 'probe') {
    return {
      action: input.action,
      resolved: publicResolved,
      capability: capabilitySummary(parsed),
      probes: {
        audio: audioProbe,
        video: videoProbe,
      },
    }
  }

  if (!parsed.internalAudioUrl) {
    throw new TikTokResolveError(
      'audio-url-missing',
      parsed.internalVideoUrl
        ? 'TikTok exposed a video stream but no direct music audio URL. This case needs a later audio-extraction/transcoding fallback.'
        : 'TikTok did not expose a trusted direct audio URL for this post.',
    )
  }

  if (audioProbe && !audioProbe.ok) {
    throw new TikTokResolveError(
      'audio-url-missing',
      `TikTok exposed an audio URL, but the same Worker could not read it (HTTP ${audioProbe.status}).`,
    )
  }

  const audio = await fetchTikTokAudioFile({
    mediaUrl: parsed.internalAudioUrl,
    referer: parsed.canonicalUrl,
    cookieHeader: page.cookieHeader,
  })

  try {
    const recognition = await recognizeWithAudD(audio)
    return {
      action: input.action,
      resolved: publicResolved,
      capability: capabilitySummary(parsed),
      probes: {
        audio: audioProbe,
        video: videoProbe,
      },
      recognition,
      audioBytesSentToAudD: audio.size,
      audioContentType: audio.type,
    }
  } catch (error) {
    if (error instanceof AudDConfigurationError) throw error
    throw new TikTokResolveError(
      'provider-error',
      error instanceof Error ? error.message : 'AudD could not recognize the TikTok audio.',
    )
  }
}

function stripInternalUrls<T extends { internalAudioUrl?: string; internalVideoUrl?: string }>(
  value: T,
) {
  const { internalAudioUrl: _audio, internalVideoUrl: _video, ...publicValue } = value
  return publicValue
}

function capabilitySummary(parsed: { internalAudioUrl?: string; internalVideoUrl?: string }) {
  return {
    directAudio: Boolean(parsed.internalAudioUrl),
    directVideo: Boolean(parsed.internalVideoUrl),
    canAttemptAudDWithoutTranscoding: Boolean(parsed.internalAudioUrl),
    needsTranscodingFallback: !parsed.internalAudioUrl && Boolean(parsed.internalVideoUrl),
  }
}
