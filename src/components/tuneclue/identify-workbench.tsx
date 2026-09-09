import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { fetchAuthSession, googleSignInUrl } from '@/lib/auth/client'
import {
  DEFAULT_SAMPLE_SECONDS,
  extractAudioSample,
  LocalMediaDecodeError,
} from '@/lib/media/extract-audio-sample'
import { recognizeAudioSample } from '@/lib/recognition/client'
import {
  type PendingRecognitionSource,
  takePendingRecognitionSource,
} from '@/lib/recognition/pending-source'
import { saveResumeSample, takeResumeSample } from '@/lib/recognition/resume-sample'
import type { RecognitionResult as RecognitionResultType } from '@/lib/recognition/types'
import { RecognitionResult } from './recognition-result'

type WorkbenchState =
  | { status: 'idle' }
  | { status: 'working'; message: string }
  | { status: 'auth-required'; sample: File }
  | { status: 'insufficient-credits' }
  | { status: 'done'; result: RecognitionResultType; remainingCredits: number }
  | { status: 'error'; message: string }

export function IdentifyWorkbench() {
  const positionId = useId()
  const [source] = useState<PendingRecognitionSource | undefined>(() =>
    takePendingRecognitionSource(),
  )
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(0)
  const [checkingResume, setCheckingResume] = useState(true)
  const [state, setState] = useState<WorkbenchState>({ status: 'idle' })
  const resumeAttempted = useRef(false)
  const [previewUrl, setPreviewUrl] = useState<string>()

  useEffect(() => {
    if (source?.kind !== 'local-file') return

    const url = URL.createObjectURL(source.file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [source])

  const identifyPreparedSample = useCallback(async (sample: File) => {
    const session = await fetchAuthSession()
    if (!session.available) {
      setState({
        status: 'error',
        message: 'Google sign-in and free recognition are not configured in this environment yet.',
      })
      return
    }
    if (!session.authenticated) {
      setState({ status: 'auth-required', sample })
      return
    }
    if (session.credits < 1) {
      setState({ status: 'insufficient-credits' })
      return
    }

    setState({ status: 'working', message: 'Identifying the song…' })
    const response = await recognizeAudioSample(sample)
    if (!response.ok) {
      if (response.code === 'auth-required') {
        setState({ status: 'auth-required', sample })
        return
      }
      if (response.code === 'insufficient-credits') {
        setState({ status: 'insufficient-credits' })
        return
      }
      setState({ status: 'error', message: response.message })
      return
    }

    setState({
      status: 'done',
      result: response.result,
      remainingCredits: response.remainingCredits,
    })
    window.dispatchEvent(new Event('tuneclue:credits-changed'))
  }, [])

  useEffect(() => {
    if (source) {
      setCheckingResume(false)
      return
    }

    const resume = new URL(window.location.href).searchParams.get('resume') === '1'
    if (!resume) {
      setCheckingResume(false)
      return
    }
    if (resumeAttempted.current) return
    resumeAttempted.current = true

    takeResumeSample()
      .then(async (sample) => {
        setCheckingResume(false)
        if (!sample) {
          setState({
            status: 'error',
            message: 'The saved recognition sample expired. Choose the source again.',
          })
          return
        }
        await identifyPreparedSample(sample)
      })
      .catch((error) => {
        setCheckingResume(false)
        setState({
          status: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'TuneClue could not restore the recognition sample.',
        })
      })
  }, [identifyPreparedSample, source])

  async function runLocalRecognition(file: File) {
    setState({ status: 'working', message: 'Preparing a short audio sample in your browser…' })
    try {
      const sample = await extractAudioSample(file, position, DEFAULT_SAMPLE_SECONDS)
      await identifyPreparedSample(sample)
    } catch (error) {
      setState({
        status: 'error',
        message:
          error instanceof LocalMediaDecodeError || error instanceof Error
            ? error.message
            : 'TuneClue could not prepare this file.',
      })
    }
  }

  if (!source && checkingResume) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <p className="text-sm text-muted-foreground">Restoring your song search…</p>
      </section>
    )
  }

  if (!source && state.status === 'idle') {
    return (
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight">Choose the source again</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          TuneClue keeps local files only in temporary browser memory. Refreshing this workbench
          clears that file.
        </p>
        <a className="mt-5 inline-flex text-sm font-medium underline underline-offset-4" href="/">
          Back to Video Song Finder
        </a>
      </section>
    )
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <a className="text-sm text-muted-foreground hover:text-foreground" href="/">
        ← Back
      </a>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Identify this song</h1>

      {source?.kind === 'local-file' ? (
        <section className="mt-6 rounded-2xl border bg-card p-4">
          {source.file.type.startsWith('video/') ? (
            // biome-ignore lint/a11y/useMediaCaption: This previews user-selected local media; TuneClue does not provide or publish its content.
            <video
              className="max-h-72 w-full rounded-xl bg-black"
              controls
              onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
              src={previewUrl}
            />
          ) : (
            // biome-ignore lint/a11y/useMediaCaption: This previews user-selected local media; TuneClue does not provide or publish its content.
            <audio
              className="w-full"
              controls
              onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
              src={previewUrl}
            />
          )}

          <div className="mt-5">
            <label className="text-sm font-medium" htmlFor={positionId}>
              Where does the clearest music start? {formatTime(position)}
            </label>
            <input
              className="mt-2 w-full"
              id={positionId}
              max={Math.max(0, duration - 1)}
              min={0}
              onChange={(event) => setPosition(Number(event.target.value))}
              step={1}
              type="range"
              value={Math.min(position, Math.max(0, duration - 1))}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              TuneClue will locally decode about {DEFAULT_SAMPLE_SECONDS} seconds from this point,
              convert it to a small WAV sample, and send only that sample for recognition.
            </p>
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              disabled={state.status === 'working'}
              onClick={() => runLocalRecognition(source.file)}
              type="button"
            >
              {state.status === 'working' ? 'Working…' : 'Find song'}
            </Button>
          </div>
        </section>
      ) : source?.kind === 'tiktok-url' ? (
        <section className="mt-6 rounded-2xl border bg-card p-5">
          <p className="text-sm font-medium">TikTok link</p>
          <p className="mt-2 break-all text-sm text-muted-foreground">{source.url}</p>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            This TikTok request cannot run until TikTok link recognition is enabled.
          </p>
        </section>
      ) : null}

      {state.status === 'working' ? (
        <p className="mt-5 text-sm text-muted-foreground" aria-live="polite">
          {state.message}
        </p>
      ) : null}

      {state.status === 'auth-required' ? (
        <section className="mt-5 rounded-2xl border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Unlock free song recognition</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Sign in with Google to identify this song for free. No card required.
          </p>
          <Button
            className="mt-4"
            onClick={async () => {
              try {
                await saveResumeSample(state.sample)
                window.location.assign(googleSignInUrl('/identify?resume=1'))
              } catch (error) {
                setState({
                  status: 'error',
                  message:
                    error instanceof Error
                      ? error.message
                      : 'TuneClue could not save this song search before sign-in.',
                })
              }
            }}
            type="button"
          >
            Continue with Google
          </Button>
        </section>
      ) : null}

      {state.status === 'insufficient-credits' ? (
        <section className="mt-5 rounded-2xl border bg-card p-5">
          <h2 className="text-lg font-semibold">No free song searches left</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Earn up to 3 free credits by opening TuneClue’s share composer once for WhatsApp,
            Telegram, and X.
          </p>
          <a
            className="mt-4 inline-flex min-h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
            href="/earn-credits"
          >
            Earn Free Credits
          </a>
        </section>
      ) : null}

      {state.status === 'error' ? (
        <div className="mt-5 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm font-medium">Recognition could not finish</p>
          <p className="mt-1 text-sm text-muted-foreground">{state.message}</p>
        </div>
      ) : null}

      {state.status === 'done' ? (
        <div className="mt-5">
          <RecognitionResult remainingCredits={state.remainingCredits} result={state.result} />
        </div>
      ) : null}
    </main>
  )
}

function formatTime(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds))
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`
}
