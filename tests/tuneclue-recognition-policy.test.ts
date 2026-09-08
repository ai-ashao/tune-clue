import { describe, expect, it } from 'vitest'
import {
  MAX_RECOGNITION_REQUEST_BYTES,
  MAX_RECOGNITION_SAMPLE_BYTES,
  RecognitionRequestBodyTooLargeError,
  readBoundedRecognitionBody,
  validateRecognitionRequestHeaders,
  validateRecognitionSample,
} from '@/lib/recognition/request-policy'

describe('TuneClue recognition request policy', () => {
  it('requires multipart recognition requests', () => {
    const request = new Request('https://tuneclue.test/api/recognize', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    })

    expect(validateRecognitionRequestHeaders(request)).toMatchObject({
      code: 'invalid-request',
      status: 415,
    })
  })

  it('rejects oversized declared request bodies', () => {
    const request = new Request('https://tuneclue.test/api/recognize', {
      method: 'POST',
      headers: {
        'content-type': 'multipart/form-data; boundary=test',
        'content-length': String(MAX_RECOGNITION_REQUEST_BYTES + 1),
      },
      body: '--test--',
    })

    expect(validateRecognitionRequestHeaders(request)).toMatchObject({
      code: 'sample-too-large',
      status: 413,
    })
  })

  it('accepts the generated WAV sample and rejects other MIME types', async () => {
    const wav = new File([wavHeader()], 'sample.wav', { type: 'audio/wav' })
    await expect(validateRecognitionSample(wav)).resolves.toBeUndefined()

    const mp3 = new File([new Uint8Array(100)], 'sample.mp3', { type: 'audio/mpeg' })
    await expect(validateRecognitionSample(mp3)).resolves.toMatchObject({
      code: 'invalid-request',
      status: 415,
    })
  })

  it('rejects a forged WAV MIME type without a RIFF/WAVE signature', async () => {
    const forged = new File([new Uint8Array(100)], 'sample.wav', { type: 'audio/wav' })

    await expect(validateRecognitionSample(forged)).resolves.toMatchObject({
      code: 'invalid-request',
      status: 415,
    })
  })

  it('rejects an oversized sample', async () => {
    const wav = new File([new Uint8Array(MAX_RECOGNITION_SAMPLE_BYTES + 1)], 'sample.wav', {
      type: 'audio/wav',
    })

    await expect(validateRecognitionSample(wav)).resolves.toMatchObject({
      code: 'sample-too-large',
      status: 413,
    })
  })

  it('stops reading a chunked body after the bounded limit', async () => {
    const body = new Uint8Array(MAX_RECOGNITION_REQUEST_BYTES + 1)
    const request = new Request('https://tuneclue.test/api/recognize', {
      method: 'POST',
      headers: { 'content-type': 'multipart/form-data; boundary=test' },
      body,
    })

    await expect(readBoundedRecognitionBody(request)).rejects.toBeInstanceOf(
      RecognitionRequestBodyTooLargeError,
    )
  })
})

function wavHeader() {
  const bytes = new Uint8Array(44)
  for (const [offset, value] of [
    [0, 'RIFF'],
    [8, 'WAVE'],
  ] as const) {
    for (let index = 0; index < value.length; index += 1) {
      bytes[offset + index] = value.charCodeAt(index)
    }
  }
  return bytes
}
