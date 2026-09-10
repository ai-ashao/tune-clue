import { ArrowLeft, LockKeyhole, Sparkles } from 'lucide-react'
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
      <section className="tc-page">
        <p className="tc-inline-status">Restoring your song search…</p>
      </section>
    )
  }

  if (!source && state.status === 'idle') {
    return (
      <section className="tc-page">
        <p className="tc-page-kicker">Video Song Finder</p>
        <h1 className="tc-page-title">Choose the source again</h1>
        <p className="tc-page-lede">
          TuneClue keeps local files only in temporary browser memory. Refreshing this workbench
          clears that file.
        </p>
        <a className="tc-back mt-5" href="/">
          <ArrowLeft aria-hidden="true" size={14} />
          Back to Video Song Finder
        </a>
      </section>
    )
  }

  return (
    <main className="tc-page">
      <a className="tc-back" href="/">
        <ArrowLeft aria-hidden="true" size={14} />
        Back
      </a>
      <p className="tc-page-kicker mt-5">Recognition workspace</p>
      <h1 className="tc-page-title">Choose the clearest music moment</h1>
      <p className="tc-page-lede">
        Move the selector past dialogue or silence. TuneClue uses about {DEFAULT_SAMPLE_SECONDS}{' '}
        seconds from the point you choose.
      </p>

      {source?.kind === 'local-file' ? (
        <section className="tc-workbench">
          <div className="tc-media-stage">
            {source.file.type.startsWith('video/') ? (
              // biome-ignore lint/a11y/useMediaCaption: local user-selected preview.
              <video
                controls
                onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
                src={previewUrl}
              />
            ) : (
              // biome-ignore lint/a11y/useMediaCaption: local user-selected preview.
              <audio
                controls
                onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
                src={previewUrl}
              />
            )}
          </div>

          <div className="tc-controls">
            <div className="flex items-center justify-between gap-4">
              <label className="text-sm font-semibold" htmlFor={positionId}>
                Sample starts at
              </label>
              <span className="font-mono text-xs font-semibold text-primary">
                {formatTime(position)}
              </span>
            </div>
            <input
              className="tc-range mt-3"
              id={positionId}
              max={Math.max(0, duration - 1)}
              min={0}
              onChange={(event) => setPosition(Number(event.target.value))}
              step={1}
              type="range"
              value={Math.min(position, Math.max(0, duration - 1))}
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="tc-trust-note">
                <LockKeyhole aria-hidden="true" size={13} />
                Only the short recognition sample leaves the browser.
              </p>
              <Button
                className="tc-primary-action"
                disabled={state.status === 'working'}
                onClick={() => runLocalRecognition(source.file)}
                type="button"
              >
                {state.status === 'working' ? 'Working…' : 'Identify song'}
              </Button>
            </div>
          </div>
        </section>
      ) : source?.kind === 'tiktok-url' ? (
        <section className="tc-state-card">
          <p className="text-sm font-semibold">TikTok link</p>
          <p className="mt-2 break-all text-sm text-muted-foreground">{source.url}</p>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            TikTok link recognition is not available until the extractor production gate passes.
          </p>
        </section>
      ) : null}

      {state.status === 'working' ? (
        <p className="tc-inline-status" aria-live="polite">
          {state.message}
        </p>
      ) : null}

      {state.status === 'auth-required' ? (
        <section className="tc-state-card tc-state-card-highlight">
          <p className="tc-page-kicker">Free recognition</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">
            Unlock your free song search
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Continue with Google to identify this song for free. No card required.
          </p>
          <Button
            className="tc-primary-action mt-4"
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
        <section className="tc-state-card tc-state-card-highlight">
          <p className="tc-page-kicker">Free credits</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">Need another song search?</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Earn up to three free credits by opening TuneClue’s share composer once on WhatsApp,
            Telegram, and X.
          </p>
          <a className="tc-header-signin mt-4" href="/earn-credits">
            <Sparkles aria-hidden="true" size={14} />
            Earn Free Credits
          </a>
        </section>
      ) : null}

      {state.status === 'error' ? (
        <div className="tc-state-card border-destructive/30">
          <p className="text-sm font-semibold">Recognition could not finish</p>
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
