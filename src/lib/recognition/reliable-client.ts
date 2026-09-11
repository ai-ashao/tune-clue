import type { RecognitionApiResponse } from './types'

// One invocation = one user operation. Only transport retries reuse its ID;
// a fresh explicit click after buying credits starts a fresh invocation/UUID.
export async function submitRecognition(
  path: string,
  init: RequestInit,
  requestId: string,
): Promise<RecognitionApiResponse> {
  let payload: RecognitionApiResponse | null = null
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(path, { ...init, cache: 'no-store' })
      payload = (await response.json()) as RecognitionApiResponse
      break
    } catch {
      if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }
  // Poll the stored result, never repeatedly upload media or invoke AudD.
  const deadline = Date.now() + 125_000
  while (
    (!payload ||
      (!payload.ok && ['in-progress', 'recognition-unavailable'].includes(payload.code))) &&
    Date.now() < deadline
  ) {
    await new Promise((resolve) => setTimeout(resolve, 2000))
    if (document.visibilityState === 'hidden') break
    try {
      const response = await fetch(
        `/api/recognition/status?requestId=${encodeURIComponent(requestId)}`,
        { cache: 'no-store' },
      )
      payload = (await response.json()) as RecognitionApiResponse
      if (response.status === 404) break
    } catch {
      break
    }
  }
  if (!payload)
    return {
      ok: false,
      code: 'recognition-unavailable',
      message: `The response was interrupted. Keep request ID ${requestId} and contact support before starting another search.`,
      requestId,
    }
  if (!payload.ok)
    return {
      ...payload,
      message: `${payload.message}${payload.attemptId ? ` Request: ${payload.attemptId}` : ` Request: ${requestId}`}`,
      requestId,
    }
  return payload
}
