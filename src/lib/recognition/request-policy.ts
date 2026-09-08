export const MAX_RECOGNITION_SAMPLE_BYTES = 512 * 1024
export const MAX_RECOGNITION_REQUEST_BYTES = 640 * 1024

const allowedAudioMimeTypes = new Set(['audio/wav', 'audio/x-wav', 'audio/wave', 'audio/vnd.wave'])

export type RecognitionRequestPolicyError = {
  code: 'invalid-request' | 'sample-too-large'
  message: string
  status: 400 | 413 | 415
}

export class RecognitionRequestBodyTooLargeError extends Error {
  constructor() {
    super('The recognition request body is too large.')
    this.name = 'RecognitionRequestBodyTooLargeError'
  }
}

export function validateRecognitionRequestHeaders(
  request: Request,
): RecognitionRequestPolicyError | undefined {
  const contentType = request.headers.get('content-type')?.toLowerCase() ?? ''
  if (!contentType.startsWith('multipart/form-data;')) {
    return {
      code: 'invalid-request',
      message: 'Recognition requests must use multipart/form-data.',
      status: 415,
    }
  }

  const rawLength = request.headers.get('content-length')
  if (rawLength) {
    const length = Number(rawLength)
    if (Number.isFinite(length) && length > MAX_RECOGNITION_REQUEST_BYTES) {
      return {
        code: 'sample-too-large',
        message: 'The recognition request body is too large.',
        status: 413,
      }
    }
  }

  return undefined
}

export async function validateRecognitionSample(
  sample: File,
): Promise<RecognitionRequestPolicyError | undefined> {
  if (sample.size <= 0) {
    return {
      code: 'invalid-request',
      message: 'The recognition sample is empty.',
      status: 400,
    }
  }

  if (sample.size > MAX_RECOGNITION_SAMPLE_BYTES) {
    return {
      code: 'sample-too-large',
      message: 'The short recognition sample is too large.',
      status: 413,
    }
  }

  if (!allowedAudioMimeTypes.has(sample.type.toLowerCase())) {
    return {
      code: 'invalid-request',
      message: 'TuneClue accepts the generated WAV recognition sample only.',
      status: 415,
    }
  }

  const signature = new Uint8Array(await sample.slice(0, 12).arrayBuffer())
  const hasWavSignature =
    signature.length === 12 &&
    asciiEquals(signature, 0, 'RIFF') &&
    asciiEquals(signature, 8, 'WAVE')
  if (!hasWavSignature) {
    return {
      code: 'invalid-request',
      message: 'TuneClue accepts a valid WAV recognition sample only.',
      status: 415,
    }
  }

  return undefined
}

function asciiEquals(bytes: Uint8Array, offset: number, expected: string) {
  return [...expected].every(
    (character, index) => bytes[offset + index] === character.charCodeAt(0),
  )
}

export async function readBoundedRecognitionBody(request: Request): Promise<ArrayBuffer> {
  if (!request.body) return new ArrayBuffer(0)

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (!value) continue

      total += value.byteLength
      if (total > MAX_RECOGNITION_REQUEST_BYTES) {
        await reader.cancel().catch(() => undefined)
        throw new RecognitionRequestBodyTooLargeError()
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }

  const body = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }
  return body.buffer
}
