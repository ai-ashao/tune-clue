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
  setPendingRecognitionSource,
  takePendingRecognitionSource,
} from '@/lib/recognition/pending-source'
import { saveResumeSample, takeResumeSample } from '@/lib/recognition/resume-sample'
import { recognizeTikTokUrl } from '@/lib/recognition/tiktok-client'
import type { RecognitionResult as RecognitionResultType } from '@/lib/recognition/types'
import { RecognitionResult } from './recognition-result'

type WorkbenchState =
  | { status: 'idle' }
  | { status: 'working'; message: string }
  | { status: 'auth-required'; sample?: File }
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

  async function runTikTokRecognition(url: string) {
    const session = await fetchAuthSession()
    if (!session.available) {
      setState({
        status: 'error',
        message: 'Google sign-in and free recognition are not configured in this environment yet.',
      })
      return
    }
    if (!session.authenticated) {
      setState({ status: 'auth-required' })
      return
    }
    if (session.credits < 1) {
      setState({ status: 'insufficient-credits' })
      return
    }

    setState({ status: 'working', message: 'Reading the public TikTok audio and identifying it…' })
    const response = await recognizeTikTokUrl(url)
    if (!response.ok) {
      if (response.code === 'auth-required') {
        setState({ status: 'auth-required' })
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
  }

  async function continueWithGoogle(sample?: File) {
    if (!sample && source?.kind === 'tiktok-url') {
      setPendingRecognitionSource(source)
      window.location.assign(googleSignInUrl('/identify'))
      return
    }

    try {
      if (!sample) throw new Error('The recognition source is no longer available.')
      await saveResumeSample(sample)
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

  const sampleLength = duration > 0 ? Math.min(DEFAULT_SAMPLE_SECONDS, duration) : 0
  const maxStart = Math.max(0, duration - sampleLength)
  const safePosition = Math.min(position, maxStart)
  const sampleEnd = safePosition + sampleLength
  const selectionLeft = duration > 0 ? (safePosition / duration) * 100 : 0
  const selectionWidth = duration > 0 ? Math.max((sampleLength / duration) * 100, 1.5) : 100

  return (
    <main className="tc-page">
      <a className="tc-back" href="/">
        <ArrowLeft aria-hidden="true" size={14} />
        Back
      </a>
      <p className="tc-page-kicker mt-5">Recognition workspace</p>
      <h1 className="tc-page-title">Choose the clearest music moment</h1>
      <p className="tc-page-lede">
        Move the selector past dialogue or silence. TuneClue uses a fixed{' '}
        {`${DEFAULT_SAMPLE_SECONDS}-second`} sample from the point you choose.
      </p>

      <section className="tc-workspace-shell" aria-live="polite">
        {state.status === 'idle' && source?.kind === 'local-file' ? (
          <div className="tc-selected-grid">
            <section className="tc-preview-card">
              <div className="tc-workspace-card-head">
                <strong>Your clip</strong>
                <a href="/">Change file</a>
              </div>
              <div className="tc-media-stage">
                {source.file.type.startsWith('video/') ? (
                  // biome-ignore lint/a11y/useMediaCaption: local user-selected preview.
                  <video
                    controls
                    onLoadedMetadata={(event) => {
                      const nextDuration = event.currentTarget.duration || 0
                      setDuration(nextDuration)
                      setPosition(preferredStart(nextDuration))
                    }}
                    src={previewUrl}
                  />
                ) : (
                  // biome-ignore lint/a11y/useMediaCaption: local user-selected preview.
                  <audio
                    controls
                    onLoadedMetadata={(event) => {
                      const nextDuration = event.currentTarget.duration || 0
                      setDuration(nextDuration)
                      setPosition(preferredStart(nextDuration))
                    }}
                    src={previewUrl}
                  />
                )}
              </div>
              <div className="tc-file-strip">
                <span>
                  <strong>{source.file.name}</strong>
                  <small>{formatBytes(source.file.size)} · local preview</small>
                </span>
                <a href="/">Remove</a>
              </div>
            </section>

            <section className="tc-selection-card">
              <div className="tc-workspace-card-head">
                <strong>Choose the clearest moment</strong>
                <span>
                  {formatTime(safePosition)} — {formatTime(sampleEnd)}
                </span>
              </div>
              <div className="tc-selection-body">
                <p className="tc-selection-copy">
                  Choose where the recognition sample should start. If less than{' '}
                  {DEFAULT_SAMPLE_SECONDS} seconds remain, TuneClue uses the rest of the clip.
                </p>
                <div className="tc-wave" aria-hidden="true">
                  <span
                    className="tc-selection-window"
                    style={{ left: `${selectionLeft}%`, width: `${selectionWidth}%` }}
                  />
                </div>
                <input
                  aria-label="Recognition sample start"
                  className="tc-range"
                  id={positionId}
                  max={maxStart}
                  min={0}
                  onChange={(event) => setPosition(Number(event.target.value))}
                  step={1}
                  type="range"
                  value={safePosition}
                />
                <div className="tc-range-labels">
                  <span>00:00</span>
                  <strong>{DEFAULT_SAMPLE_SECONDS}-second sample</strong>
                  <span>{formatTime(duration)}</span>
                </div>
                <div className="tc-selected-action">
                  <p className="tc-selected-note">
                    <LockKeyhole aria-hidden="true" className="tc-selected-note-icon" size={13} />
                    Only the short audio sample leaves your browser.
                  </p>
                  <Button
                    className="tc-primary-action tc-workspace-action"
                    onClick={() => runLocalRecognition(source.file)}
                    type="button"
                  >
                    Find song →
                  </Button>
                </div>
              </div>
            </section>
          </div>
        ) : null}

        {state.status === 'idle' && source?.kind === 'tiktok-url' ? (
          <div className="tc-workspace-center tc-link-ready">
            <p className="tc-page-kicker">TikTok link</p>
            <h2 className="tc-workspace-title">Ready to identify this video</h2>
            <p className="tc-workspace-copy break-all">{source.url}</p>
            <Button
              className="tc-primary-action tc-workspace-action"
              onClick={() => runTikTokRecognition(source.url)}
              type="button"
            >
              Identify song →
            </Button>
          </div>
        ) : null}

        {state.status === 'working' ? (
          <div className="tc-workspace-center tc-processing">
            <span className="tc-loader-ring" aria-hidden="true" />
            <h2 className="tc-workspace-title">Identifying the song…</h2>
            <p className="tc-workspace-copy">{state.message}</p>
            <span className="tc-progress-track" aria-hidden="true">
              <i />
            </span>
          </div>
        ) : null}

        {state.status === 'auth-required' ? (
          <div className="tc-workspace-center tc-auth-gate">
            <span className="tc-gate-icon">
              <LockKeyhole aria-hidden="true" size={28} />
            </span>
            <h2 className="tc-workspace-title">Sign in to continue</h2>
            <p className="tc-workspace-copy">
              Sign in to get a free song search and continue identifying. No card required.
            </p>
            <Button
              className="tc-google-action tc-workspace-action"
              onClick={() => continueWithGoogle(state.sample)}
              type="button"
            >
              <span aria-hidden="true">G</span>
              Continue with Google
            </Button>
            <button
              className="tc-workspace-back"
              onClick={() => setState({ status: 'idle' })}
              type="button"
            >
              ← Back
            </button>
          </div>
        ) : null}

        {state.status === 'insufficient-credits' ? (
          <div className="tc-workspace-center tc-auth-gate">
            <span className="tc-gate-icon">
              <Sparkles aria-hidden="true" size={28} />
            </span>
            <h2 className="tc-workspace-title">Need another song search?</h2>
            <p className="tc-workspace-copy">
              Earn up to three free credits by opening TuneClue’s share composer once on WhatsApp,
              Telegram, and X.
            </p>
            <a className="tc-primary-action tc-workspace-action" href="/earn-credits">
              <Sparkles aria-hidden="true" size={14} />
              Earn Free Credits
            </a>
          </div>
        ) : null}

        {state.status === 'error' ? (
          <div className="tc-workspace-center tc-auth-gate">
            <span className="tc-gate-icon tc-gate-icon-error">!</span>
            <h2 className="tc-workspace-title">Recognition could not finish</h2>
            <p className="tc-workspace-copy">{state.message}</p>
            <button
              className="tc-workspace-back"
              onClick={() => setState({ status: 'idle' })}
              type="button"
            >
              ← Back to source
            </button>
          </div>
        ) : null}

        {state.status === 'done' ? (
          <div className="tc-workspace-result">
            <RecognitionResult remainingCredits={state.remainingCredits} result={state.result} />
          </div>
        ) : null}
      </section>
    </main>
  )
}

function preferredStart(duration: number) {
  return Math.min(18, Math.max(0, duration - Math.min(DEFAULT_SAMPLE_SECONDS, duration)))
}

function formatTime(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds))
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
