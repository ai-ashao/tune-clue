import { useEffect, useId, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
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
import type { RecognitionResult as RecognitionResultType } from '@/lib/recognition/types'
import { RecognitionResult } from './recognition-result'

export function IdentifyWorkbench() {
  const positionId = useId()
  const [source] = useState<PendingRecognitionSource | undefined>(() =>
    takePendingRecognitionSource(),
  )
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(0)
  const [state, setState] = useState<
    | { status: 'idle' }
    | { status: 'working'; message: string }
    | { status: 'done'; result: RecognitionResultType }
    | { status: 'error'; message: string }
  >({ status: 'idle' })

  const previewUrl = useMemo(
    () => (source?.kind === 'local-file' ? URL.createObjectURL(source.file) : undefined),
    [source],
  )

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    },
    [previewUrl],
  )

  if (!source) {
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

  async function runLocalRecognition(file: File) {
    setState({ status: 'working', message: 'Preparing a short audio sample in your browser…' })
    try {
      const sample = await extractAudioSample(file, position, DEFAULT_SAMPLE_SECONDS)
      setState({ status: 'working', message: 'Identifying the song…' })
      const response = await recognizeAudioSample(sample)
      if (!response.ok) {
        setState({ status: 'error', message: response.message })
        return
      }
      setState({ status: 'done', result: response.result })
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

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <a className="text-sm text-muted-foreground hover:text-foreground" href="/">
        ← Back
      </a>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Identify this song</h1>

      {source.kind === 'local-file' ? (
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
      ) : (
        <section className="mt-6 rounded-2xl border bg-card p-5">
          <p className="text-sm font-medium">TikTok link</p>
          <p className="mt-2 break-all text-sm text-muted-foreground">{source.url}</p>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            This TikTok request cannot run until TikTok link recognition is enabled.
          </p>
        </section>
      )}

      {state.status === 'working' ? (
        <p className="mt-5 text-sm text-muted-foreground" aria-live="polite">
          {state.message}
        </p>
      ) : null}

      {state.status === 'error' ? (
        <div className="mt-5 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm font-medium">Recognition could not finish</p>
          <p className="mt-1 text-sm text-muted-foreground">{state.message}</p>
        </div>
      ) : null}

      {state.status === 'done' ? (
        <div className="mt-5">
          <RecognitionResult result={state.result} />
        </div>
      ) : null}
    </main>
  )
}

function formatTime(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds))
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`
}
