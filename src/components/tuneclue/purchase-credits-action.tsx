import { useRef, useState } from 'react'
import { fetchAuthSession } from '@/lib/auth/client'
import { saveBillingResume } from '@/lib/billing/resume'
import { DEFAULT_SAMPLE_SECONDS, extractAudioSample } from '@/lib/media/extract-audio-sample'
import type { PendingRecognitionSource } from '@/lib/recognition/pending-source'

export function PurchaseCreditsAction({
  source,
  sample,
  position = 0,
}: {
  source?: PendingRecognitionSource
  sample?: File
  position?: number
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const lock = useRef(false)
  async function openPurchase() {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    try {
      const session = await fetchAuthSession()
      if (!session.authenticated) throw new Error('Sign in again before purchasing credits.')
      const saved = sample
        ? { kind: 'sample' as const, sample }
        : source?.kind === 'tiktok-url'
          ? source
          : source?.kind === 'local-file'
            ? {
                kind: 'sample' as const,
                sample: await extractAudioSample(source.file, position, DEFAULT_SAMPLE_SECONDS),
              }
            : undefined
      if (saved) await saveBillingResume(saved, session.user.id)
      const returnTo = saved ? '/identify?purchase_resume=1' : '/account'
      window.location.assign(`/buy-credits?returnTo=${encodeURIComponent(returnTo)}`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Checkout could not be opened.')
      lock.current = false
      setBusy(false)
    }
  }
  return (
    <div className="mt-4">
      <button className="tc-header-signin" type="button" disabled={busy} onClick={openPurchase}>
        {busy ? 'Saving your song search…' : 'Buy recognition credits'}
      </button>
      {error ? (
        <p role="alert">
          {error} <a href="/buy-credits">Open credit packs without saving this search</a>
        </p>
      ) : null}
    </div>
  )
}
