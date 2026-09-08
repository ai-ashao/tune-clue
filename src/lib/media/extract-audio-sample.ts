import { encodeMonoPcm16Wav } from './wav'

const SAMPLE_RATE = 16_000
const MAX_SAMPLE_SECONDS = 12
export const DEFAULT_SAMPLE_SECONDS = 10
export const MAX_LOCAL_FILE_BYTES = 40 * 1024 * 1024

export class LocalMediaDecodeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LocalMediaDecodeError'
  }
}

export async function extractAudioSample(
  file: File,
  startSeconds = 0,
  durationSeconds = DEFAULT_SAMPLE_SECONDS,
): Promise<File> {
  if (file.size <= 0) throw new LocalMediaDecodeError('The selected file is empty.')
  if (file.size > MAX_LOCAL_FILE_BYTES) {
    throw new LocalMediaDecodeError('Choose a file smaller than 40 MB for this V1 browser flow.')
  }

  const AudioContextClass = window.AudioContext
  if (!AudioContextClass) {
    throw new LocalMediaDecodeError('This browser does not expose the Web Audio decoder.')
  }

  const context = new AudioContextClass()
  try {
    const bytes = await file.arrayBuffer()
    const decoded = await context.decodeAudioData(bytes)

    const safeStart = Math.max(0, Math.min(startSeconds, Math.max(0, decoded.duration - 0.1)))
    const requestedDuration = Math.max(0.5, Math.min(durationSeconds, MAX_SAMPLE_SECONDS))
    const safeDuration = Math.max(
      0.5,
      Math.min(requestedDuration, Math.max(0.5, decoded.duration - safeStart)),
    )

    const frameCount = Math.max(1, Math.ceil(safeDuration * SAMPLE_RATE))
    const offline = new OfflineAudioContext(1, frameCount, SAMPLE_RATE)
    const source = offline.createBufferSource()
    source.buffer = decoded
    source.connect(offline.destination)
    source.start(0, safeStart, safeDuration)

    const rendered = await offline.startRendering()
    const wav = encodeMonoPcm16Wav(rendered.getChannelData(0), SAMPLE_RATE)
    return new File([wav], 'tuneclue-sample.wav', { type: 'audio/wav' })
  } catch (error) {
    if (error instanceof LocalMediaDecodeError) throw error
    throw new LocalMediaDecodeError(
      'This browser could not decode the selected media locally. Try MP3, WAV, M4A, or a browser-compatible MP4/WebM clip.',
    )
  } finally {
    await context.close().catch(() => undefined)
  }
}
